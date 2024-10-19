import "./Leaderboard.scss";
import {
  useMediaQuery,
  Grid,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import bomb from "../assets/images/bomb.png";
import link from "../assets/images/link.png";
import axios from "axios";
import { useState } from "react";
import useGameStore from "../GameStore";
import { useEffect } from "react";
import { NavLink } from "react-router-dom";

const Leaderboard = () => {
  const { walletAddressList, setWalletAddressList } = useGameStore();
  const [netGainList, setNetGainList] = useState([]);
  const [lastplayedlist, setLastplayedlist] = useState([]);
  const [dayOrweek, setDayOrWeek] = useState(true);

  const isDesktop = useMediaQuery("(min-width:600px)");
  const onClickToday = async () => {
    setDayOrWeek(!dayOrweek);
    getTodayData();
  };

  const onClickWeek = async () => {
    setDayOrWeek(!dayOrweek);
    getWeedkData();
  };

  const getWeedkData = async () => {
    const result = await axios.get(
      `${process.env.REACT_APP_BACKEND_URL}/api/getWeekHighlight`
    );
    let walletAddress = [];
    let netGain = [];
    let playdate = [];
    result.data.forEach((data, key) => {
      let temp = false;
      for (let i = 0; i < walletAddress.length; i++) {
        if (walletAddress[i] == data.walletAddress) {
          temp = true;
          netGain[i] += data.payout;
          continue;
        }
      }
      if (temp == false) {
        walletAddress.push(data.walletAddress);
        netGain.push(data.payout);
      }
    });
    const tempnetGain = Array.from(netGain);
    const tempwalletAddress = Array.from(walletAddress);

    tempnetGain.sort((a, b) => {
      return b - a;
    });

    for (let j = 0; j < tempnetGain.length; j++) {
      for (let k = 0; k < netGain.length; k++) {
        if (tempnetGain[j] == netGain[k]) {
          tempwalletAddress[j] = walletAddress[k];
          netGain[k] = -1;
        }
      }
    }

    let tempDate = Date.parse("01/01/2022");
    for (let l = 0; l < tempwalletAddress.length; l++) {
      let finaldate = Date.parse("01/01/2022");
      result.data.forEach((data, key) => {
        if (data.walletAddress == tempwalletAddress[l]) {
          if (Date.parse(data.date) > tempDate)
            finaldate = Date.parse(data.date);
        }
      });
      playdate.push(finaldate);
    }
    const tempG = Array.from(tempnetGain.slice(0, 20));
    const tempW = Array.from(tempwalletAddress.slice(0, 20));
    setLastplayedlist(playdate);
    setNetGainList(tempG);
    setWalletAddressList(tempW);
  };

  useEffect(() => {
    getTodayData();
  }, []);

  const getTodayData = async () => {
    const result = await axios.get(
      `${process.env.REACT_APP_BACKEND_URL}/api/getTodayHighlight`
    );
    let walletAddress = [];
    let netGain = [];
    result.data.forEach((data, key) => {
      let temp = false;
      for (let i = 0; i < walletAddress.length; i++) {
        if (walletAddress[i] == data.walletAddress) {
          temp = true;
          netGain[i] += data.payout;
          continue;
        }
      }
      if (temp == false) {
        walletAddress.push(data.walletAddress);
        netGain.push(data.payout);
      }
    });

    const tempnetGain = Array.from(netGain);
    const tempwalletAddress = Array.from(walletAddress);

    tempnetGain.sort((a, b) => {
      return b - a;
    });

    for (let j = 0; j < tempnetGain.length; j++) {
      for (let k = 0; k < netGain.length; k++) {
        if (tempnetGain[j] == netGain[k]) {
          tempwalletAddress[j] = walletAddress[k];
          netGain[k] = -1;
        }
      }
    }
    const tempG = Array.from(tempnetGain.slice(0, 20));
    const tempW = Array.from(tempwalletAddress.slice(0, 20));
    setNetGainList(tempG);
    setWalletAddressList(tempW);
  };

  const getShortName = (fullName) => {
    if (fullName.length < 10) return fullName;
    return (
      fullName.slice(0, 3) +
      "..." +
      fullName.slice(fullName.length - 4, fullName.length - 1)
    );
  };

  const historyList = walletAddressList.map((walletAddress, key) => {
    let gain = parseFloat(netGainList[key].toFixed(2));
    return (
      <>
        <TableRow className="table-row">
          <TableCell align="center">{`${key + 1}. ${getShortName(
            walletAddress
          )}`}</TableCell>
          <TableCell align="center">{gain} SOL</TableCell>
          <TableCell align="center">Today</TableCell>
        </TableRow>
      </>
    );
  });

  return (
    <Grid className="leaderboard">
      <Grid container className="header">
        <Grid xs={1}></Grid>
        <Grid xs={10} className="title">
          <img className="mine-logo" src={bomb}></img>
          <div className="mine-link">
            <p className="minerush-text">MinesRush Leaderboard</p>
            <NavLink className="nav-link" to="/">
              <img className="link-img" src={link}></img>
              <span className="minerush-link">minesrush.com</span>
            </NavLink>
          </div>
        </Grid>
        <Grid xs={1}></Grid>
      </Grid>
      <Grid container className="body">
        <Grid xs={1}></Grid>
        <Grid xs={10}>
          <Box className="date-select">
            <Button
              className={
                !dayOrweek
                  ? "date-select-button-disabled"
                  : "date-select-button"
              }
            >
              <span className="button-text" onClick={onClickToday}>
                Today
              </span>
            </Button>
            <Button
              className={
                dayOrweek ? "date-select-button-disabled" : "date-select-button"
              }
            >
              <span className="button-text" onClick={onClickWeek}>
                This Week
              </span>
            </Button>
          </Box>
          <Box className="history-list">
            <Grid className="list-title">
              <p className="title-text">Top Miners</p>
            </Grid>
            <TableContainer className="table-container">
              <Table className="table-grid" aria-label="customized table">
                <TableHead className="table-header">
                  <TableRow className="table-row">
                    <TableCell align="center">Miner</TableCell>
                    <TableCell align="center">Net Gain</TableCell>
                    <TableCell align="center">Last Played</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody className="table-body">{historyList}</TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Grid>
        <Grid xs={1}></Grid>
      </Grid>
    </Grid>
  );
};

export default Leaderboard;
