use std::sync::{Condvar, Mutex, MutexGuard};

/// 同時実行数を制限しつつ、待機中のものは後から来た順（LIFO）に通すリミッター。
/// スクロールで通り過ぎたサムネより、今画面にあるサムネ（=最新のリクエスト）を優先するために使う。
pub struct LifoLimiter {
  state: Mutex<LimiterState>,
  cvar: Condvar,
  max_concurrent: usize,
}

struct LimiterState {
  running: usize,
  /// 待機中のチケット。末尾が最新
  waiting: Vec<u64>,
  next_ticket: u64,
}

pub struct LifoGuard<'a> {
  limiter: &'a LifoLimiter,
}

impl LifoLimiter {
  pub fn new(max_concurrent: usize) -> Self {
    Self {
      state: Mutex::new(LimiterState {
        running: 0,
        waiting: Vec::new(),
        next_ticket: 0,
      }),
      cvar: Condvar::new(),
      max_concurrent: max_concurrent.max(1),
    }
  }

  fn lock(&self) -> MutexGuard<'_, LimiterState> {
    self.state.lock().unwrap_or_else(|e| e.into_inner())
  }

  /// 実行枠を獲得するまでブロックする。待機中は最新のチケットから順に通す。
  pub fn acquire(&self) -> LifoGuard<'_> {
    let mut state = self.lock();
    let ticket = state.next_ticket;
    state.next_ticket += 1;
    state.waiting.push(ticket);

    while !(state.running < self.max_concurrent && state.waiting.last() == Some(&ticket)) {
      state = self.cvar.wait(state).unwrap_or_else(|e| e.into_inner());
    }

    state.waiting.pop();
    state.running += 1;
    // 枠が余っていれば次の待機者も通れるので起こす
    self.cvar.notify_all();

    LifoGuard { limiter: self }
  }
}

impl Drop for LifoGuard<'_> {
  fn drop(&mut self) {
    let mut state = self.limiter.lock();
    state.running -= 1;
    self.limiter.cvar.notify_all();
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::sync::Arc;
  use std::thread;
  use std::time::Duration;

  fn waiting_len(limiter: &LifoLimiter) -> usize {
    limiter.lock().waiting.len()
  }

  #[test]
  fn waiters_are_released_newest_first() {
    let limiter = Arc::new(LifoLimiter::new(1));
    let order = Arc::new(Mutex::new(Vec::new()));

    let first = limiter.acquire();

    let mut handles = Vec::new();
    for i in 0..3 {
      let worker_limiter = Arc::clone(&limiter);
      let order = Arc::clone(&order);
      handles.push(thread::spawn(move || {
        let _guard = worker_limiter.acquire();
        order.lock().unwrap_or_else(|e| e.into_inner()).push(i);
      }));
      // i 番目が待機列に入るまで待ってから次を投入する
      while waiting_len(&limiter) < i + 1 {
        thread::sleep(Duration::from_millis(1));
      }
    }

    drop(first);
    for h in handles {
      h.join().unwrap_or_else(|_| panic!("worker panicked"));
    }

    assert_eq!(
      *order.lock().unwrap_or_else(|e| e.into_inner()),
      vec![2, 1, 0]
    );
  }
}
