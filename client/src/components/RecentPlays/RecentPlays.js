import {
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
import { useEffect } from "react";
import { tableCellClasses } from "@mui/material/TableCell";
import point from "../../assets/images/point.png";
import "./RecentPlays.scss";
import useGameStore from "../../GameStore";
import axios from "axios";

// sound
import speaker from "../../assets/images/speaker.png";
import speaker_blacktheme from "../../assets/images/speaker_blacktheme.png";
import speaker_mute from "../../assets/images/speaker_mute.png";
import speaker_mute_blacktheme from "../../assets/images/speaker_mute_blacktheme.png";
// import playgame_sound from "../../assets/audios/PlayGame.mp3";
import playgame_sound from "../../assets/audios/MinesClickSound.mp3";

import Sound from "react-sound";
import { useState } from "react";
import { io } from "socket.io-client";
// import useGameStore from "../../GameStore";

// responsive design
import useMediaQuery from "@mui/material/useMediaQuery";

const RecentPlays = ({ socket }) => {
  const isDesktop = useMediaQuery("(min-width:600px)");
  const { gameHistory, setGameHistory } = useGameStore();
  const { isMuted, setIsMuted } = useGameStore();
  const [is_playgame_sound, setIs_playgame_sound] = useState(false);
  const { themeBlack, setThemeBlack } = useGameStore();

  const emitHistory = () => {
    socket.on("historyChanged", (msg) => {
      getHistory();
    });
  };

  const getHistory = async () => {
    await axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/history/get`)
      .then((res) => {
        const newGameHistory = res.data;
        if(newGameHistory.length !== 0)
          setGameHistory(newGameHistory);
      });
  };

  useEffect(() => {
    getHistory();
    emitHistory();
  }, []);

  const getShortName = (fullName) => {
    if (fullName.length < 10) return fullName;
    return (
      fullName.slice(0, 3) +
      "..." +
      fullName.slice(fullName.length - 4, fullName.length - 1)
    );
  };

  const onVolumeClick = () => {
    setIsMuted(!isMuted);
  };

  const handleClick = () => {
    setThemeBlack(!themeBlack);
    setIs_playgame_sound(true);
  };

  const handleSongFinishedPlaying = () => {
    setIs_playgame_sound(false);
  };

  const historyList = gameHistory.map((item, key) => {
    let payout = item.payout;
    let earn = true;
    if (item.payout == 0) {
      payout = "-" + item.wager;
      earn = false;
    } else {
      payout = parseFloat(payout.toFixed(3));
    }

    return (
      <>
        <TableRow className="table-row">
          {isDesktop && <TableCell align="center">{item.game}</TableCell>}
          <TableCell align="center">{getShortName(item.player)}</TableCell>
          {isDesktop && <TableCell align="center">{item.wager}</TableCell>}
          <TableCell
            align="center"
            style={earn ? { color: " #286A08" } : { color: "#CE461B" }}
          >
            {payout}
            <img src={point} className="recentplays-point" />
          </TableCell>
        </TableRow>
      </>
    );
  });

  return (
    <Grid
      className="recentplays-container"
      container
      style={isDesktop ? {} : { marginBottom: "40px" }}
    >
      <Grid xs={0.5} sm={1} md={2} lg={2.5} />
      <Grid xs={11} sm={10} md={8} lg={7}>
        <p
          className={
            isDesktop
              ? "recentplays-title"
              : themeBlack
              ? "recentplays-title"
              : "recentplays-title-mobile"
          }
          id="test"
        >
          RECENT PLAYS
        </p>
        <Box
          className={themeBlack ? "recentplays-grid-black" : "recentplays-grid"}
        >
          <TableContainer className="table-container">
            <Table className="table-grid" aria-label="customized table">
              <TableHead className="table-header">
                <TableRow className="table-row">
                  {isDesktop && <TableCell align="center">GAME</TableCell>}
                  <TableCell align="center">PLAYER</TableCell>
                  {isDesktop && <TableCell align="center">WAGER</TableCell>}
                  <TableCell align="center">PAYOUT</TableCell>
                </TableRow>
              </TableHead>
              <TableBody className="table-body">{historyList}</TableBody>
            </Table>
          </TableContainer>
        </Box>
        {isDesktop && (
          <p className="recentplays-text">
            The #1 most trusted gaming on Solana
          </p>
        )}
      </Grid>
      <Grid xs={0.5} sm={1} md={2} lg={2.5} />
      <Sound
        url={playgame_sound}
        playStatus={
          isMuted && is_playgame_sound
            ? Sound.status.PLAYING
            : Sound.status.STOPPED
        }
        playFromPosition={0}
        onFinishedPlaying={handleSongFinishedPlaying}
      />

      {!isDesktop && (
        <>
          <Grid xs={3} style={{ marginTop: "30px" }} />
          <Grid xs={3} style={{ marginTop: "30px" }}>
            <Button
              className={themeBlack ? "footer-item-black" : "footer-item"}
              style={{ borderRadius: "10px" }}
              onClick={handleClick}
            >
              LIGHT
            </Button>
          </Grid>
          <Grid xs={3}>
            <Button
              className={themeBlack ? "footer-item-black" : "footer-item"}
              style={{ marginTop: "30px", borderRadius: "10px" }}
              onClick={onVolumeClick}
            >
              {isMuted ? (
                <img
                  className="control-option-image"
                  src={themeBlack ? speaker_blacktheme : speaker}
                />
              ) : (
                <img
                  className="control-option-image"
                  src={themeBlack ? speaker_mute_blacktheme : speaker_mute}
                />
              )}
            </Button>
          </Grid>
          <Grid xs={3} />
        </>
      )}
    </Grid>
  );
};

export default RecentPlays;
