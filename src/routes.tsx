import { Route, Switch } from "wouter";
import FolderView from "./components/pages/FolderView";
import Library from "./components/pages/Library";
import Settings from "./components/pages/Settings";

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
