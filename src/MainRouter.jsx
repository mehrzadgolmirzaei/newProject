import React from "react";
import { Route, Switch } from "react-router";
import EditCard from "./component/Home/EditCard";
import Home from "./component/Home/Home";
import Consultant from "./Consultant/Consultant";

const MainRouter = () => {
  return (
    <Switch>
      <Route path="/home" render={() => <Home/> } />
      <Route path="/cardid"  render={() => <EditCard/> } />
      <Route path="/consultant" render={() => <Consultant/>} />
    </Switch>
  );
};

export default MainRouter;
