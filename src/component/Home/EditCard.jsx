import React, { useState } from 'react';
import { withRouter } from 'react-router';



const EditCard = ({history}) => {

const [firstname,setFirstname]= useState();
const [lastname,setLastname] = useState();
const [ Age ,setAge] = useState ();


const handleSubmit = (event) => {
    event.preventDefault();
    
    let users = localStorage.getItem("users")
     users= JSON.parse(users);
     let id = new Date().getMilliseconds();
    let obj = { firstname , lastname, Age ,id} ;
    users.push(obj);
    localStorage.setItem("users" ,JSON.stringify(users));
    history.push("/home")

}    



    return (  
<div>
<div
      className="text-center mx-auto logincard bg-light"
      style={{ maxWidth: "500px" }}
    >
      <form className="card p-2 mt-5" 
      
      onSubmit={(e) => handleSubmit(e)}>
        <div className="form-group">
          <label>نام </label>
          <input
            type="text"
            className="form-control"
       onChange = {(e) => setFirstname(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label> نام خانوادگی</label>
          <input
            type="text"
            className="form-control"
            onChange = {(e) => setLastname(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label> سن</label>
          <input
            type="number"
            className="form-control"
            onChange = {(e) => setAge(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </form>
    </div>
</div>


    );
}
 
export default withRouter( EditCard) ;