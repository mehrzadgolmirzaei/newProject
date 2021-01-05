import React from "react";
import logo from "../static/image/logo.svg";
import search from "../static/image/serch.svg";
import { Link } from "react-router-dom";
import { Dialog } from "@reach/dialog";
import "@reach/dialog/styles.css";
import { useState } from "react";

const HedearConsultant = () => {
  const [showDialog, setShowDialog] = useState(false);
  const handleopen = () => {
    setShowDialog(true);
  };
  const handleclos = () => {
    setShowDialog(false);
  };

  return (
    <div className="consultantheader">
      <header className=" header position-relative main-header ">
        <div className="d-flex align-items-center justify-content-between mx-0 mx-x1-4 ">
          <Link to="/home">
            <img src={logo} style={{ width: "150px " }}></img>
          </Link>

          <form className=" ">
            <input type="text  " className="ttt" placeholder="جستجوی دوره ها  " />
            <button className="btn btn-sm btn-login" type="submit">
              <img className=" p-1" src={search} />
            </button>
          </form>

          <div className=" fonnt d-none d-md-flex flex-grow-1 align-items-center      justify-content-sm-center   ">
            <p className=" py-0 my-0 mx-1 px-2 align-self-center main-header-menu curser-pointer">
              همه ی دوره
            </p>
            <p className=" py-0 my-0 mx-1 px-2 align-self-center main-header-menu curser-pointer">
              لیست دوره
            </p>
            <p className=" py-0 my-0 mx-1 px-2 align-self-center main-header-menu curser-pointer">
              لیست اساتید
            </p>
          </div>
          {/* dialog */}
          <div>
            <button
              onClick={handleopen}
              className="  mx-2 px-4 align-self-center mehrzad btn text-white"
            >
              ورود /ثبت نام
            </button>
            <Dialog isOpen={showDialog} onDismiss={handleclos}>
              <button className=" btn btn-dark" onClick={handleclos}>
                <span aria-hidden>×</span>
              </button>
              <p>Hello there. I am a dialog</p>
            </Dialog>
          </div>
          {/* dialog */}
        </div>


        <div className=" row container mx-auto  my-3 ">
          <div className=" col-2   mr-auto">
   

            <button className="mehrzad btn text-white ">
              {" "}
              <h5> دروس اموزشی </h5>
            </button>
          </div>
          <div className=" col-2 ">
          
            <p  className="mehrzad btn text-white"    >
              <h5>نشست</h5>
            </p>
          </div>
          <div className=" col-2 ">
          
            <button className="mehrzad btn text-white">
              {" "}
              <h5>پشتیبانی </h5>{" "}
            </button>
          </div>
          <div className=" col-2  ml-auto">
         
            <button className="mehrzad btn text-white">
              {" "}
              <h5>کانال ها</h5>{" "}
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default HedearConsultant;
