import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  Button,
  Modal,
  autocompleteClasses,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Mine from "../Mine";
import "./GameBoard.scss";
import axios from "axios";
import useGameStore from "../../GameStore";
import rectangleImage from "../../assets/images/rectangle.png";
import yellowrectangle from "../../assets/images/yellowrectangle.png";
import claimEmotion from "../../assets/images/claimEmotion.png";
import yellowRectangle from "../../assets/images/yellowrectangle.png";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

// import sounds
import Sound from "react-sound";
import cashoutsound from "../../assets/audios/CashoutSound.mp3";
import coinsound from "../../assets/audios/CoinSound.mp3";
import coinstreak_sound from "../../assets/audios/CoinStreak.mp3";
import hitbombsound from "../../assets/audios/HitBomb.mp3";
import mineexplosionsound from "../../assets/audios/Mines_-_Explosion.mp3";
// import playgame_sound from "../../assets/audios/PlayGame.mp3";
import playgame_sound from "../../assets/audios/MinesClickSound.mp3";

import backgroundmusic from "../../assets/audios/backgroundmusic.mp3";
import * as CryptoJS from "crypto-js";
import useSound from "use-sound";

const GameBoard = ({ socket }) => {
  const theme = useTheme();
  const matchUpMd = theme.breakpoints.up("md");
  const { gameState, setGameState } = useGameStore();
  const { bettingAmount } = useGameStore();
  const { boardState, setBoardState, walletAddress } = useGameStore();
  const { boardClickedState, setBoardClickedState } = useGameStore();
  const [gameOverModalOpen, setGameOverModalOpen] = useState(false);
  const [winModalOpen, setWinModalOpen] = useState(false);
  const [winFinalModalOpen, setWinFinalModalOpen] = useState(false);

  const { nextMultiplier, setNextMultiplier } = useGameStore();
  const { gameStep, setGameStep } = useGameStore();
  const { mineAmount, setMineAmount } = useGameStore();
  const { houseEdge } = useGameStore();
  const [winModalMultiplier, setWinModalMultiplier] = useState(1);
  const { publicKey, sendTransaction } = useWallet();
  const { previousMultiplier, setPreviousMultiplier } = useGameStore();

  const [is_coinsound, setIs_coinsound] = useState(false);
  const [is_mineexplosionsound, setIs_minesexplosion] = useState(false);
  const [is_cashoutsound, setIs_cashoutsound] = useState(false);
  const { isMuted, setIsMuted } = useGameStore();
  const { themeBlack, setThemeBlack } = useGameStore();

  const [playgamesoundplay] = useSound(playgame_sound);
  const [coinsoundplay] = useSound(coinsound);
  const [cashoutsoundplay] = useSound(cashoutsound);
  const [mineexplosionsoundplay] = useSound(mineexplosionsound);
  const [backgroundsoundplay] = useSound(backgroundmusic);
  const [nextmulti, setNextmulti] = useState();

  const { userName } = useGameStore();

  useEffect(() => {
    changeNextMultiplier();
  }, []);

  useEffect(() => {
    let tempNextmulti = 1;
    for (let j = 0; j < gameStep + 1; j++) {
      tempNextmulti *= 25 / (25 - mineAmount);
    }
    setNextmulti(parseFloat((tempNextmulti * houseEdge).toFixed(3)));
    console.log(nextmulti);
  }, []);

  useEffect(() => {
    let tempNextmulti = 1;
    for (let j = 0; j < gameStep + 1; j++) {
      tempNextmulti *= 25 / (25 - mineAmount);
    }
    setNextmulti(parseFloat((tempNextmulti * houseEdge).toFixed(3)));
    console.log(nextmulti);
  }, [gameStep]);

  const changeNextMultiplier = () => {
    if (gameState == 0) {
      setPreviousMultiplier(1);
      let tempMultiplier = 1;
      for (let i = 0; i < gameStep + 1; i++) {
        tempMultiplier *= (25 - i) / (25 - i - mineAmount);
      }
      setNextMultiplier(tempMultiplier);
      if (gameStep > 0) {
        let tempMultiplier = 1;
        for (let i = 0; i < gameStep - 1; i++) {
          tempMultiplier *= (25 - i) / (25 - i - mineAmount);
        }
        setWinModalMultiplier(tempMultiplier);
      }
      return;
    } else {
      let tempMultiplier = 1;
      for (let i = 0; i < gameStep + 1; i++) {
        tempMultiplier *= (25 - i) / (25 - i - mineAmount);
      }
      setPreviousMultiplier(tempMultiplier);
    }

    let tempMultiplier = 1;
    for (let i = 0; i < gameStep + 2; i++) {
      tempMultiplier *= (25 - i) / (25 - i - mineAmount);
    }
    setNextMultiplier(tempMultiplier);
  };

  const clickEvent = async (boardNum) => {
    // if user click a button that already clicked, it will rejected
    if (boardClickedState[boardNum] == 1) return;

    // if gameState == 0, game not started
    if (gameState == 0) return;

    const newBoardState = boardState;
    const body = {
      walletAddress: publicKey.toBase58(),
      boardNum,
    };
    let res = await axios
      .post(`${process.env.REACT_APP_BACKEND_URL}/api/checkMine`, body)
      .then(async (res) => {
        const newBoardClickedState = boardClickedState;

        if (res.data.result === "bomb") {
          // setIs_minesexplosion(true);
          if (isMuted) mineexplosionsoundplay();
          const body = {
            walletAddress: publicKey.toBase58(),
            game: "Minesrush",
            player: userName == "MinesRush" ? publicKey : userName,
            wager: bettingAmount,
            payout: 0,
          };

          newBoardClickedState[boardNum] = 1;
          setBoardClickedState(newBoardClickedState);

          setGameState(0);
          const allBoardState = JSON.parse(res.data.board.boardString);
          allBoardState.forEach((item, key) => {
            if (item === 0) allBoardState[key] = 1;
            else allBoardState[key] = 2;
          });
          const cboardState = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0,
          ];
          setBoardClickedState(cboardState);
          setGameStep(0);
          setPreviousMultiplier(1);
          setNextMultiplier(1);

          revealBoardState(allBoardState);

          // await axios
          //   .post(`${process.env.REACT_APP_BACKEND_URL}/api/saveHistory`, body)
          //   .then((res) => {})
          //   .catch((err) => {
          //     console.log(err);
          //   });

          socket.emit("history", "historyChanged");

          return;
        }
        // play coinsound
        // setIs_coinsound(true);
        if (isMuted) coinsoundplay();

        newBoardState[boardNum] = 1;

        // if user WIN
        if (1 * gameStep + 1 * mineAmount == 24) {
          // play cashoutsound
          // setIs_cashoutsound(true);
          if (isMuted) cashoutsoundplay();

          const body = {
            walletAddress: publicKey.toBase58(),
            game: "Minesrush",
            player: userName == "MinesRush" ? publicKey : userName,
            wager: bettingAmount,
            payout: nextMultiplier * houseEdge * bettingAmount,
          };
          // await axios
          //   .post(`${process.env.REACT_APP_BACKEND_URL}/api/saveHistory`, body)
          //   .then((res) => {})
          //   .catch((err) => {});
          socket.emit("history", "historyChanged");

          const cboardState = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0,
          ];
          setBoardClickedState(cboardState);
          setWinModalMultiplier(nextMultiplier);
          setWinFinalModalOpen(true);
          setGameState(0);
          setGameStep(0);
          setPreviousMultiplier(1);
          setNextMultiplier(1);

          return;
        }
        setGameStep(gameStep + 1);

        changeNextMultiplier();
        setBoardState(newBoardState);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const revealBoardState = (allBoardState) => {
    boardState.map((item, key) => {
      if (boardClickedState[key] === 0)
        if (allBoardState[key] === 1) allBoardState[key] = 3;
        else allBoardState[key] = 4;
    });

    setBoardState(allBoardState);
    const cboardState = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    setBoardClickedState(cboardState);
  };

  const onClickStopGame = async () => {
    const newBoardState = boardState;
    const boardNum = 0;
    const body = {
      walletAddress: publicKey.toBase58(),
      boardNum,
    };
    await axios
      .post(`${process.env.REACT_APP_BACKEND_URL}/api/checkMine`, body)
      .then((res) => {
        setGameState(0);
        const allBoardState = JSON.parse(res.data.board.boardString);
        allBoardState.forEach((item, key) => {
          if (item === 0) allBoardState[key] = 1;
          else allBoardState[key] = 2;
        });
        setGameStep(0);
        setPreviousMultiplier(1);
        setNextMultiplier(1);
        revealBoardState(allBoardState);
      });
  };

  const handleGameOverModalClose = () => {
    setGameOverModalOpen(false);
  };

  const handleWinModalClose = () => {
    setWinModalOpen(false);
  };

  const handleWinFinalModalClose = () => {
    setWinFinalModalOpen(false);
  };

  const onClickCloseBtn = () => {
    setGameOverModalOpen(false);
  };

  const onClickWinCloseBtn = () => {
    setWinModalOpen(false);
  };

  const handleSongFinishedPlaying = () => {
    setIs_coinsound(false);
    setIs_minesexplosion(false);
    setIs_cashoutsound(false);
  };

  const rectangle = boardState.map((item, key) => {
    return (
      <>
        {key % 5 === 0 ? <Grid xs={1}></Grid> : <></>}
        <Grid
          xs={2}
          className="mine-block"
          onClick={() => {
            clickEvent(key);
          }}
        >
          <Mine type={boardState[key]} />
        </Grid>
        {key % 5 === 4 ? <Grid xs={1}></Grid> : <></>}
      </>
    );
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", margin: "5px" }}>
        <Typography
          className="multiplier"
          component="Stack"
          alignItems="center"
        >
          Next Multiplier
          <Typography
            component="span"
            className="multiplier-value"
            sx={{ diplay: "flex", alignItems: "center" }}
          >
            &nbsp; X
            {/* {nextMultiplier == 1
              ? 1
              : parseFloat((nextMultiplier * houseEdge).toFixed(3))} */}
            {parseFloat(nextmulti)}
          </Typography>
        </Typography>
      </div>
      <Grid className="gameboard-container" container>
        <Grid xs={1} sm={2} md={3} lg={4} />
        <Grid xs={10} sm={8} md={6} lg={4} style={{ display: "flex" }}>
          <Grid
            className={themeBlack ? "gameboard-black" : "gameboard"}
            container
            spacing={2}
          >
            {rectangle}
          </Grid>
        </Grid>
        <Grid xs={1} sm={2} md={3} lg={4} />
        <Modal
          open={gameOverModalOpen}
          onClose={handleGameOverModalClose}
          aria-labelledby="parent-modal-title"
          aria-describedby="parent-modal-description"
        >
          <Box sx={styleFair} style={{ backgroundColor: "#101112" }}>
            <Typography
              variant="h3"
              component="h2"
              color="#F7BE44"
              fontSize="40px"
              fontFamily="Mada"
              marginTop="20px"
            >
              Fair
            </Typography>

            <img className="rectangle-image" src={rectangleImage}></img>

            <Grid container style={{ textAlign: "center" }}>
              <Grid item xs={1}></Grid>
              <Grid item xs={10}>
                <Typography color="#fff" fontSize="18px" fontFamily="Mada">
                  Playing on the website is secure. The fairness of all bets is
                  unquestionable since we use cryptography to make sure every
                  bet is transparently fair and can be checked.
                </Typography>
              </Grid>
              <Grid item xs={1}></Grid>
              <Grid item xs={12}>
                <img className="yellow-image" src={yellowrectangle}></img>
              </Grid>
            </Grid>
          </Box>
        </Modal>
        <Modal
          open={winModalOpen}
          onClose={handleWinModalClose}
          aria-labelledby="parent-modal-title"
          aria-describedby="parent-modal-description"
        >
          <Box sx={styleStop}>
            <Typography color="#F7BE44" fontSize="70px" fontFamily="Mada">
              x
              {parseFloat(
                (nextMultiplier * houseEdge * bettingAmount).toFixed(3)
              )}
            </Typography>

            <Grid container style={{ textAlign: "center" }}>
              <Grid item xs={12}>
                <img className="claimEmotion" src={claimEmotion}></img>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Grid item xs={12}>
                <span style={{ color: "#FFFFFF" }}>You Won </span>
                <span style={{ color: "#F7BE44" }}>0.25</span>
              </Grid>
              <Button
                variant="contained"
                style={{
                  marginTop: "10px",
                  color: "#000",
                  backgroundColor: "#F7BE44",
                }}
                onClick={onClickStopGame}
                fontSize="10px"
              >
                Claim Reward
              </Button>
              <img className="yellow-image-claim" src={yellowRectangle}></img>
            </Grid>
          </Box>
        </Modal>
        <Modal
          open={winFinalModalOpen}
          onClose={handleWinFinalModalClose}
          aria-labelledby="parent-modal-title"
          aria-describedby="parent-modal-description"
        >
          <Box sx={styleStop}>
            <Typography color="#F7BE44" fontSize="70px" fontFamily="Mada">
              x{parseFloat((winModalMultiplier * houseEdge).toFixed(3))}
            </Typography>

            <Grid container style={{ textAlign: "center" }}>
              <Grid item xs={12}>
                <img className="claimEmotion" src={claimEmotion}></img>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Grid item xs={12}>
                <span style={{ color: "#FFFFFF" }}>You Won </span>
                <span style={{ color: "#F7BE44" }}>
                  {" "}
                  {parseFloat(
                    (winModalMultiplier * houseEdge * bettingAmount).toFixed(3)
                  )}
                </span>
              </Grid>
              <img className="yellow-image-claim" src={yellowRectangle}></img>
            </Grid>
          </Box>
        </Modal>
        <Sound
          url={coinsound}
          playStatus={
            isMuted && is_coinsound
              ? Sound.status.PLAYING
              : Sound.status.STOPPED
          }
          playFromPosition={0}
          onFinishedPlaying={handleSongFinishedPlaying}
        />
        <Sound
          url={mineexplosionsound}
          playStatus={
            isMuted && is_mineexplosionsound
              ? Sound.status.PLAYING
              : Sound.status.STOPPED
          }
          playFromPosition={0}
          onFinishedPlaying={handleSongFinishedPlaying}
        />
        <Sound
          url={cashoutsound}
          playStatus={
            isMuted && is_cashoutsound
              ? Sound.status.PLAYING
              : Sound.status.STOPPED
          }
          playFromPosition={0}
          onFinishedPlaying={handleSongFinishedPlaying}
        />
      </Grid>
    </>
  );
};

const style = {
  textAlign: "center",
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 250,
  bgcolor: "background.paper",
  borderRadius: "10px",
  boxShadow: 24,
  p: 4,
  padding: "20px",
};

const styleStop = {
  textAlign: "center",
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "246px",
  height: "auto",
  bgcolor: "#101112",
  borderRadius: "10px",
  boxShadow: 24,
  p: 4,
  padding: "0px",
};

const styleFair = {
  textAlign: "center",
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "270px",
  height: "316px",
  bgcolor: "background.paper",
  borderRadius: "10px",
  boxShadow: 24,
  p: 4,
  padding: "0px",
};

export default GameBoard;
