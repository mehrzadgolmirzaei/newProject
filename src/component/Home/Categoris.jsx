import React, { useEffect, useState } from "react";

import axios from "axios";
const Categoris = ({history}) => {
  // const data = [
  //   { firstname: "ali", lastname: "kk", age: "564" },
  //   { firstname: "ali", lastname: "kk", age: "564" },
  //   { firstname: "ali", lastname: "kk", age: "564" },
  // ];

  // const [Packeages , setpakeages]=useState();

  // const handleGetData = async () => {
  //     let res = await axios.get(`/api/category/all`);
  //     if (res.status === 200) {
  //         setpakeages(res.data);
  //     }

  // useEffect(() => {
  //     handleGetData()
  // }, [])

  const [users, setUser] = useState([]);

  const [forceUpdate , setForceUpdate] = useState();

  const handledelet = (each) => {
    let all = JSON.parse(localStorage.getItem("users"));
    all = all.filter((tt) => tt.id !== each.id);
    localStorage.setItem("users", JSON.stringify(all));
  setForceUpdate(!forceUpdate)
  };

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("users")));
  }, [forceUpdate]);

  return (
    <div className="categoris  boxing">
      <div className=" d-flex  mx-2 my-3 ">
        <h3 className=" text-center mx-5  "> روان خرد سال</h3>
        <p className="  btncat p-1 " >مشاهده همه</p>
      </div>
      {/* <button onClick={e => handleGetData(e)}> ccc</button> */}
      <div className="row">
        {users.map((each) => (
          <div key={each.id} 
          className="col-4 p-5" 
          >
            <div  
              className="card py-2 px-4 text-justify w-100 "
              style={{
                borderRadius: "16px",
                backgroundColor: "rgb(255 227 157 / 21%)",
              }}
            >
              <h3> کودک مقدس مهر ماه</h3>
              <br />
              <h5> در این دوره یه چیزی میشه</h5>
              <br />
              <p className="  font-weight-bold">
                {each.firstname} {each.lastname}
              </p>
              <br />
              <p>{each.Age}</p>
              <br />
              <p>{each.id}</p>
              <div className=" d-flex justify-content-between align-content-center mt-2   ">
                <div className=" boxetmam align-self-center d-flex main-price  ">
              
                  <p className=" my-0 mx-1">اتمام مهلت خرید</p>
                </div>
                <button className="btn    d-inline"    style={{
                borderRadius: "16px",
                backgroundColor: "rgb(255 227 157 / 21%)",
              }} 
                  onClick={() => handledelet(each)}>حذف</button>
                <div className=" boxmosha  ">
              
                  <p>مشاهده</p>
               
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* <div className=" mx-3 p-2">
          <div className="  box2 text-justify w-100">
            <h3> کودک مقدس مهر ماه</h3>
            <br />
            <h5> در این دوره یه چیزی میشه</h5>
            <br />
            <br />
            <br />
            <br />
            <br />
            <div className=" d-flex main-price  justify-content-between ">
              <p>مشاهده</p>

              <p>اتمام مهلت خرید</p>
            </div>
          </div>
        </div>

        <div className=" mx-3 p-2">
          <div className="  box2 text-justify w-100">
            <h3> کودک مقدس مهر ماه</h3>
            <br />
            <h5> در این دوره یه چیزی میشه</h5>
            <br />
            <br />
            <br />
            <br />
            <br />
            <div className=" d-flex main-price  justify-content-between ">
              <p>مشاهده</p>

              <p>اتمام مهلت خرید</p>
            </div>
          </div>
        </div> */}
      </div>

      {/* div */}
      {/* 
      <div>
      <p> {Packeages.length > 0 ? Packeages[0].services[0].title : ""}</p>
    </div>
 */}
    </div>
  );
};

export default Categoris;
