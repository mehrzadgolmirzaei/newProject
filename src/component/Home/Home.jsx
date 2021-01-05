import React from "react";
import Header from "../common/Header";
import "../../static/css/Home.css";
import Categoris from "./Categoris";
import Footer from "./../common/Footer";
const Home = () => {
  return (
    <div>
      <div className="main-bg">
        <Header />
        <Categoris />
      </div>

      <Footer />
    </div>
  );
};

export default Home;
