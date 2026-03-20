import { Route, Switch } from "wouter";
import FolderView from "./components/pages/FolderView";
import Library from "./components/pages/Library";
import PhotoViewer from "./components/pages/PhotoViewer";
import Settings from "./components/pages/Settings";

const Routes = () => (
  <Switch>
    <Route path="/" component={Library} />
    <Route path="/folders/:folderId" component={FolderView} />
    <Route path="/folders/:folderId/photos/:id" component={PhotoViewer} />
    <Route path="/settings" component={Settings} />
  </Switch>
);

export default Routes;
