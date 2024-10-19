import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Homepage = () => {
  let navigate = useNavigate();

  useEffect(() => {
    let timerId;
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      navigate("/gameplay");
    }, 2 * 1000);
    navigate("/splash");
  }, []);
  return <div style={{ backgroundColor: "#101223" }}></div>;
};

export default Homepage;
