import { Route, Switch } from "wouter";
import Settings from "./components/pages/Settings";

const Library = () => <div>ライブラリ（すべて）</div>;
const FolderView = () => <div>フォルダ</div>;
const PhotoViewer = () => <div>ビューワー</div>;

const Routes = () => (
  <Switch>
    <Route path="/" component={Library} />
    <Route path="/folders/:id" component={FolderView} />
    <Route path="/photos/:id" component={PhotoViewer} />
    <Route path="/settings" component={Settings} />
  </Switch>
);

export default Routes;
