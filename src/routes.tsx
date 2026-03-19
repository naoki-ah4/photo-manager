import { Route, Switch } from "wouter";

const Library = () => <div>ライブラリ（すべて）</div>;
const FolderView = () => <div>フォルダ</div>;
const PhotoViewer = () => <div>ビューワー</div>;
const Settings = () => <div>設定</div>;

const Routes = () => (
  <Switch>
    <Route path="/" component={Library} />
    <Route path="/folders/:id" component={FolderView} />
    <Route path="/photos/:id" component={PhotoViewer} />
    <Route path="/settings" component={Settings} />
  </Switch>
);

export default Routes;
