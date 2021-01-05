import React, { useState } from "react";
import { Link, withRouter } from "react-router-dom";
import logo from "../../static/image/logo.svg";
import search from "../../static/image/serch.svg";
import book from "../../static/image/book.svg";
import { Dialog } from "@reach/dialog";
import "@reach/dialog/styles.css";
import Lottie from "lottie-react-web";
import animation from "../../static/lottie/asas.json";
import zanbor from "../../static/lottie/zanbor.json";

const Header = ({ history }) => {
  const [showDialog, setShowDialog] = useState(false);
  const handleopen = () => {
    setShowDialog(true);
  };
  const handleclos = () => {
    setShowDialog(false);
  };

  return (
    <div className="row">
      <header className="Header position-relative main-header ">
        <div className="d-flex align-items-center justify-content-between mx-0 mx-x1-4">
          <Link to="/home">
            <img src={logo} style={{ width: "150px " }}></img>
          </Link>

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

          <form className=" ">
            <input
              type="text"
              className="  ttt "
              placeholder="جستجوی دوره ها  "
            />
            <button className="btn btn-sm btn-login" type="submit">
              <div className="tsts">
                <img className=" p-1 tdtd" src={search} />
              </div>
            </button>

            {/* 
            <div className=" mt-2  ">
              <input
                type="text"
                className="form__input"
                id="name"
                placeholder="Full name"
                required=""
              />
              <label for="name" className="form__label">
                Full Name
              </label>
            </div> */}
          </form>

          <div className=" fonnt d-none d-md-flex flex-grow-1 align-items-center    justify-content-center   ">
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
        </div>
        {/* text */}
        <div className=" row ">
          <div className="col-2"></div>
          <div className=" col-8 position-relative">
            <h1 className="font-weight-bold display-4 text-center txtfont  mx-auto">
              {" "}
              توانیم
            </h1>

            <h3 className="  font-weight-lighter text-center mt-3 txtfont">
              {" "}
              پلتفرم اموزشی مجازی
            </h3>
          </div>

          <div className=" col-2   d-none d-xl-block       ">
            <Lottie
              options={{
                animationData: animation,
                loop: true,
              }}
              width="200px"
              height="150px"
            />
          </div>
        </div>
        {/* text */}

        {/* menu */}
        <div className=" row container mx-auto  my-3 ">
          <div className=" col-2   mr-auto">
            {/* <div className="m-1 bg-white text-center d-flex justify-content-between buttoon p-2">
              <h6> دوره اموزشی</h6>
              <img src={book} className=" header-image" />
            </div> */}

            <button className="mehrzad btn text-white ">
              {" "}
              <h5> دروس اموزشی </h5>
            </button>
          </div>
          <div className=" col-2 ">
            {/* <div className="m-1 bg-white text-center d-flex justify-content-between buttoon p-2 ">
              <h6>پشتیبانی</h6>

              <img src={book} className=" header-image" />
            </div> */}
            <p onClick={() => history.push("/consultant")}
             
              className="mehrzad btn text-white"
            >
              <h5>نشست</h5>
            </p>
          </div>
          <div className=" col-2 ">
            {/* <div className="m-1 bg-white text-center d-flex justify-content-between buttoon p-2">
              <h6> نشست</h6>
              <img src={book} className=" header-image" />
            </div> */}
            <button className="mehrzad btn text-white">
              {" "}
              <h5>پشتیبانی </h5>{" "}
            </button>
          </div>
          <div className=" col-2  ml-auto">
            {/* <div className="m-1 bg-white text-center  d-flex justify-content-between buttoon p-2">
              <h6>کانال ها</h6>
              <img src={book} className=" header-image" />
            </div> */}
            <button className="mehrzad btn text-white">
              {" "}
              <h5>کانال ها</h5>{" "}
            </button>
          </div>
        </div>
        <div className="zanbor">
          <Lottie
            options={{
              animationData: zanbor,
              loop: true,
            }}
            width="200px"
            height="150px"
          />
        </div>

        {/* menu */}
      </header>
    </div>
  );
};

export default withRouter(Header);
