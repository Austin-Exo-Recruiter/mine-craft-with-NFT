import {
  Box,
  Grid,
  Button,
  Modal,
  Typography,
  TextField,
  Stack,
  Slider,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import messaging from "../../assets/images/messaging.png";
import solana from "../../assets/images/solana.png";
import options from "../../assets/images/setting.png";
import yellowRectangle from "../../assets/images/yellowrectangle.png";
import mineamountsetting from "../../assets/images/mineamountsetting.png";
import { houseAddress } from "../../constants";
import claimEmotion from "../../assets/images/claimEmotion.png";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import "./BettingPanel.scss";
import axios from "axios";
import useGameStore from "../../GameStore";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as solanaWeb3 from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Sound from "react-sound";
import cashoutsound from "../../assets/audios/CashoutSound.mp3";
import coin_sound from "../../assets/audios/CoinSound.mp3";
import coinstreak_sound from "../../assets/audios/CoinStreak.mp3";
import hitbomb_sound from "../../assets/audios/HitBomb.mp3";
import mineexplosion_sound from "../../assets/audios/Mines_-_Explosion.mp3";
// import playgame_sound from "../../assets/audios/PlayGame.mp3";
import playgame_sound from "../../assets/audios/MinesClickSound.mp3";
import { useEffect } from "react";

import useSound from "use-sound";
import { connect, Socket } from "socket.io-client";
import * as CryptoJS from "crypto-js";

const BettingPanel = ({
  loading,
  setLoading,
  depositText,
  setDepositText,
  socket,
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));
  const { gameHistory, setGameHistory } = useGameStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [playModalOpen, setPlayModalOpen] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [connectWalletModalOpen, setConnectWalletModalOpen] = useState(false);
  const { boardClickedState, setBoardClickedState } = useGameStore();
  const { isMuted, setIsMuted } = useGameStore();
  const { walletAddress, setWalletAddress } = useGameStore();
  const { boardState, setBoardState } = useGameStore();
  const { mineAmount, setMineAmount } = useGameStore();
  const { previousMultiplier, setPreviousMultiplier } = useGameStore();
  const { bettingAmount, setBettingAmount } = useGameStore();
  const { gameState, setGameState } = useGameStore();
  const { gameStep, setGameStep } = useGameStore();
  const { nextMultiplier, setNextMultiplier } = useGameStore();
  const { houseEdge } = useGameStore();
  const [mineSliderAmount, setMineSliderAmount] = useState(mineAmount);
  const { connected } = useWallet();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [clicked, setClicked] = useState(false);
  const [is_playgame_sound, setIs_playgame_sound] = useState(false);
  const [is_cashoutsound, setIs_cashoutsound] = useState(false);
  const [playgamesoundplay] = useSound(playgame_sound);
  const [cashoutsoundplay] = useSound(cashoutsound);
  const [coinsoundplay] = useSound(coin_sound);
  const [hitbombsoundplay] = useSound(hitbomb_sound);
  const { userName } = useGameStore();
  const [discordModalOpen, setDiscordModalOpen] = useState(false);
  const { themeBlack, setThemeBlack } = useGameStore();
  const { is_backgroundmusic, setIs_backgroundMusic } = useGameStore();
  const { solAmount, setSolAmount } = useGameStore();
  const [multi, setMulti] = useState(1);

  useEffect(() => {
    setIs_backgroundMusic(true);
  }, []);

  useEffect(() => {
    let tempMulti = 1;
    for (let j = 0; j < gameStep; j++) {
      tempMulti *= 25 / (25 - mineAmount);
    }
    setMulti(tempMulti * houseEdge);
    console.log(multi);
  }, [gameStep]);

  const getHistory = async () => {
    await axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/history/get`)
      .then((res) => {
        const newGameHistory = res.data;
        setGameHistory(newGameHistory);
      });
  };

  const changeNextMultiplier = () => {
    if (gameStep == 0) {
      setPreviousMultiplier(1);
    } else {
      let tempMultiplier = 1;
      for (let i = 0; i < gameStep - 1; i++) {
        tempMultiplier *= 25 / (25 - mineSliderAmount);
      }
      setPreviousMultiplier(tempMultiplier);
    }

    let tempMultiplier = 1;
    for (let i = 0; i < gameStep + 1; i++) {
      tempMultiplier *= 25 / (25 - mineSliderAmount);
    }
    setNextMultiplier(tempMultiplier);
  };

  const checkAlreadyDeposit = async () => {
    const body = {
      walletAddress: publicKey.toBase58(),
      mineAmount: mineAmount,
    };
    const result = {};
    await axios
      .post(`${process.env.REACT_APP_BACKEND_URL}/checkAlreadyDeposit`, body)
      .then((res) => {
        result.bettingAmount = res.data.bettingAmount;
        result.mineAmount = res.data.mineAmount;
        result.result = res.data.result;
      })
      .catch((err) => {
        console.log(err);
      });

    return result;
  };

  const onPlay = async () => {
    //
    // setIs_playgame_sound(true);
    if (isMuted) playgamesoundplay();
    // wallet integration
    if (!connected) {
      setConnectWalletModalOpen(true);
      return;
    }
    setWalletAddress(publicKey.toBase58());

    // if user clicked "CASH OUT"
    if (gameState == 1) {
      setStopModalOpen(true);
      return;
    }

    const depoResult = await checkAlreadyDeposit();
    if (depoResult.result == "success") {
      setBettingAmount(depoResult.bettingAmount);
      setMineAmount(depoResult.mineAmount);
      setGameState(1);
    } else {
      // Deposit SOL
      const result = await deposit();
    }

    const cboardState = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    setGameStep(0);
    changeNextMultiplier();
    setBoardState(cboardState);
    setBoardClickedState(cboardState);
    // setGameState(1);

    await postPlay();
  };

  // Depoist User SOL
  const deposit = async () => {
    let amount = bettingAmount;
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new solanaWeb3.PublicKey(process.env.REACT_APP_HOUSE_ADDR),
        lamports: solanaWeb3.LAMPORTS_PER_SOL * amount,
      })
    );

    transaction.recentBlockhash = (
      await connection.getRecentBlockhash("max")
    ).blockhash;
    transaction.feePayer = publicKey;
    const signedTx = await signTransaction(transaction);

    setDepositText(true);
    setLoading(true);

    const t1 = solanaWeb3.Transaction.from(signedTx.serialize());
    let stringfyTx = JSON.stringify(t1.serialize());
    // let hash = await connection.sendRawTransaction(await signedTx.serialize());
    // console.log("hash", hash);

    // let signature = null;
    // while (signature == null) {
    //   signature = await connection.getTransaction(hash, {
    //     commitment: "confirmed",
    //   });
    //   console.log("waiting for confirmed");
    // }

    // console.log(signature.transaction.signatures[0]);
    // console.log("tx has confirmed");
    // let tx = null;
    // while (tx == null) {
    //   console.log("waiting for confirm tx");
    //   tx = await connection.getTransaction(signature, {
    //     commitment: "confirmed",
    //   });
    // }
    // await connection.confirmTransaction(signature);
    // const status = await connection.getSignatureStatus(signature, {
    //   searchTransactionHistory: true,
    // });
    // console.log(status.value);
    const body = {
      walletAddress: publicKey.toBase58(),
      bettingAmount,
      mineAmount,
      signedTx: stringfyTx,
    };

    const res = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/verifyDeposit`,
      body
    );

    // hook and change SOL balance
    const balanceCheckData = {
      hash: res.data.hash,
    };
    axios
      .post(
        `${process.env.REACT_APP_BACKEND_URL}/balanceCheck`,
        balanceCheckData
      )
      .then(async (res) => {
        const bal = await connection.getBalance(publicKey);
        setSolAmount(bal / solanaWeb3.LAMPORTS_PER_SOL);
      })
      .catch((err) => {
        console.log(err);
      });

    setGameState(1);
    setDepositText(false);
    setLoading(false);
  };

  const handlePlayModalClose = () => {
    setPlayModalOpen(false);
  };

  const handleStopModalClose = () => {
    setStopModalOpen(false);
  };

  const handleConnectWalletModalClose = () => {
    setConnectWalletModalOpen(false);
  };

  const onClickConnectWallet = () => {};

  const onClickStartGame = () => {
    const cboardState = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    setGameStep(gameStep + 1);
    changeNextMultiplier();
    setBoardState(cboardState);
    setGameState(1);
    setPlayModalOpen(false);
  };

  const onClickStopGame = async () => {
    // music
    // setIs_cashoutsound(true);
    // document.getElementById('cashoutsound').play();
    if (isMuted) cashoutsoundplay();

    // if user double clicked "Claim Reward" button, it is ignored
    if (clicked == true) return;
    setClicked(true);

    const body = {
      walletAddress: publicKey.toBase58(),
    };

    await axios
      .post(`${process.env.REACT_APP_BACKEND_URL}/api/stop`, body)
      .then(async (res) => {
        // const body = {
        //   walletAddress: publicKey.toBase58(),
        //   game: "MinesRush",
        //   player: userName == "MinesRush" ? publicKey : userName,
        //   wager: bettingAmount,
        //   payout: multi * bettingAmount,
        // };
        // console.log("origin hisdata", body);

        // await axios
        //   .post(`${process.env.REACT_APP_BACKEND_URL}/api/saveHistory`, body)
        //   .then((res) => {
        //     getHistory();

        //   })
        //   .catch((err) => {
        //     console.log(err);
        //   });
        setClicked(false);
        socket.emit("history", "historyChanged");

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

    // hook and change SOL balance
    const balanceCheckData = {
      publicKey: publicKey.toBase58(),
    };
    axios
      .post(
        `${process.env.REACT_APP_BACKEND_URL}/hookBalChange`,
        balanceCheckData
      )
      .then(async (res) => {
        const { changedBal } = res.data;
        setSolAmount(changedBal / solanaWeb3.LAMPORTS_PER_SOL);
      })
      .catch((err) => {
        console.log(err);
      });

    setStopModalOpen(false);
  };

  const revealBoardState = (allBoardState) => {
    boardState.map((item, key) => {
      if (boardClickedState[key] === 0)
        if (allBoardState[key] === 1) allBoardState[key] = 3;
        else allBoardState[key] = 4;
    });
    setBoardState(allBoardState);
  };

  const onClickCloseButton = () => {
    // setIs_playgame_sound(true);
    // document.getElementById('playgamesound').play();
    if (isMuted) playgamesoundplay();

    if ((mineAmount > 24) | (mineAmount < 1)) return;
    setMineAmount(mineSliderAmount);
    changeNextMultiplier();
    setModalOpen(false);
  };

  const onBNumberClick = (e, number) => {
    if (number == 24) {
      setModalOpen(true);
      return;
    }
    setMineAmount(number);
    const bNumbers = document.getElementsByClassName("bomb-amounts");

    for (const bNumber of bNumbers) {
      bNumber.classList.remove("active");
    }
    e.target.classList.add("active");
  };

  const onBettingClick = async (val) => {
    // setIs_playgame_sound(true);
    // document.getElementById('playgamesound').play()
    if (isMuted) playgamesoundplay();
    if (val == "plus") {
      if (bettingAmount == 0.05) setBettingAmount(0.1);
      else if (bettingAmount == 0.1) setBettingAmount(0.25);
      else if (bettingAmount == 0.25) setBettingAmount(0.5);
      else if (bettingAmount == 0.5) return;
      // else if (bettingAmount == 1) setBettingAmount(2);
      // else if (bettingAmount == 2)
      // setBettingAmount(parseFloat((bettingAmount + 0.1).toFixed(2)));
    } else if (val == "minus") {
      if (bettingAmount == 0.05) return;
      else if (bettingAmount == 0.1) setBettingAmount(0.05);
      else if (bettingAmount == 0.25) setBettingAmount(0.1);
      else if (bettingAmount == 0.5) setBettingAmount(0.25);
      else if (bettingAmount == 1) setBettingAmount(0.5);
      else if (bettingAmount == 2) setBettingAmount(1);
    } else {
      setBettingAmount(val);
    }
  };

  const onOpen = () => {
    if (isMuted) playgamesoundplay();
    setModalOpen(true);
    // setIs_playgame_sound(true);
    // document.getElementById('playgamesound').play()
  };

  const postPlay = async () => {
    const body = {
      walletAddress: publicKey.toBase58(),
      mineAmount,
      bettingAmount,
    };

    let res = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/api/play`,
      body
    );
  };

  const handleSliderChange = (event, newVal) => {
    setMineSliderAmount(newVal);
  };

  const handleSongFinishedPlaying = () => {
    setIs_playgame_sound(false);
    setIs_cashoutsound(false);
  };

  const onClickDiscordMsg = () => {
    setDiscordModalOpen(true);
    // alert("modal opened")
  };

  const handleDiscordModalClose = () => {
    setDiscordModalOpen(false);
    // alert("modal closed")
  };

  const style = themeBlack
    ? {
        textAlign: "center",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 250,
        bgcolor: "#1C1F26",
        // border: "2px solid #000",
        borderRadius: "10px",
        boxShadow: 24,
        p: 4,
      }
    : {
        textAlign: "center",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 250,
        bgcolor: "#fff",
        // border: "2px solid #000",
        borderRadius: "10px",
        boxShadow: 24,
        p: 4,
      };

  const stylemobile = themeBlack
    ? {
        textAlign: "center",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 200,
        bgcolor: "#1C1F26",
        // border: "2px solid #000",
        borderRadius: "10px",
        boxShadow: 24,
        p: 4,
      }
    : {
        textAlign: "center",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 200,
        bgcolor: "#fff",
        // border: "2px solid #000",
        borderRadius: "10px",
        boxShadow: 24,
        p: 4,
      };

  const styleStop = themeBlack
    ? {
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
      }
    : {
        textAlign: "center",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "246px",
        height: "auto",
        bgcolor: "#fff",
        borderRadius: "10px",
        boxShadow: 24,
        p: 4,
        padding: "0px",
      };

  const styleDiscord = {
    textAlign: "center",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "350",
    height: "500px",
    bgcolor: "#101112",
    // border: "2px solid #000",
    borderRadius: "10px",
    boxShadow: 24,
    p: 4,
    padding: "0px",
  };

  return (
    <Grid className="bettingpanel-container" container>
      <Grid xs={1} sm={2} md={3} lg={4} />
      <Grid
        className="bettingpanel-box"
        xs={10}
        sm={8}
        md={6}
        lg={4}
        style={
          isDesktop
            ? {}
            : themeBlack
            ? { backgroundColor: "#101112", padding: "5px" }
            : { backgroundColor: "#f5f5f5", padding: "5px" }
        }
      >
        <Box
          className="settings-text"
          style={{ marginTop: "20px", marginBottom: "5px" }}
        >
          <span
            className={
              isDesktop
                ? "setting-amount"
                : themeBlack
                ? "setting-amount"
                : "setting-amount-mobile"
            }
          >
            Sol Amount
          </span>
          {isDesktop && (
            <span className="minmax-values">
              Min. Mine: <span className="betsetting-value">5</span> Max. Mine:{" "}
              <span className="betsetting-value">24</span>
            </span>
          )}
          {isDesktop && (
            <span className="payout-values">
              Payout:{" "}
              <span className="payout-value-num">
                {parseFloat((multi * bettingAmount).toFixed(3))}
              </span>{" "}
              <img></img>
            </span>
          )}
        </Box>
        <Box
          className={themeBlack ? "betting-buttons-black" : "betting-buttons"}
          style={
            isDesktop
              ? { marginTop: "0px" }
              : { justifyContent: "space-between", padding: "0px" }
          }
        >
          <Box className="betting-amount">
            <Box className="betting-amount-value">
              <img className="solana-image" src={solana} />
              <span className="betting-value-text">{bettingAmount}</span>
            </Box>
            <Box
              className="betting-amount-control"
              style={isDesktop ? {} : { display: "none" }}
            >
              <Button
                className="betting-amount-addition"
                onClick={() => onBettingClick("plus")}
                disabled={gameState == 0 ? false : true}
              >
                +
              </Button>
              <Button
                className="betting-amount-addition"
                onClick={() => onBettingClick("minus")}
                disabled={gameState == 0 ? false : true}
              >
                -
              </Button>
            </Box>
          </Box>
          <Button
            className="betting-play"
            onClick={onPlay}
            style={{ textTransform: "none" }}
          >
            <PlayArrowIcon />

            {gameState == 0 ? "Play Game" : "Cash-Out"}
          </Button>
          <Button
            className="betting-options"
            onClick={onOpen}
            disabled={gameState == 0 ? false : true}
            style={isDesktop ? {} : { display: "none" }}
          >
            <div className="options-image " image={options}>
              {mineAmount}
            </div>
          </Button>
        </Box>
        <Box
          justifyContent="space-between"
          className={
            themeBlack ? "betting-values-group-black" : "betting-values-group"
          }
          sx={{
            display: isDesktop ? "flex" : "grid !important",
            gridTemplateRows: "repeat(2, auto)",
            gridTemplateColumns: "repeat(3, auto)",
            rowGap: 2,
          }}
          style={isDesktop ? {} : { background: "none" }}
        >
          <Button
            className="betting-values"
            onClick={() => onBettingClick(0.05)}
            disabled={gameState == 0 ? false : true}
            style={isDesktop ? {} : { width: "90px", height: "35px" }}
          >
            0.05
          </Button>
          <Button
            className="betting-values"
            onClick={() => onBettingClick(0.1)}
            disabled={gameState == 0 ? false : true}
            style={isDesktop ? {} : { width: "90px", height: "35px" }}
          >
            0.10
          </Button>
          <Button
            className="betting-values"
            onClick={() => onBettingClick(0.25)}
            disabled={gameState == 0 ? false : true}
            style={isDesktop ? {} : { width: "90px", height: "35px" }}
          >
            0.25
          </Button>
          <Button
            className="betting-values"
            onClick={() => onBettingClick(0.5)}
            disabled={gameState == 0 ? false : true}
            style={isDesktop ? {} : { width: "90px", height: "35px" }}
          >
            0.5
          </Button>
          <Button
            className="betting-values"
            // onClick={() => onBettingClick(1)}
            disabled={gameState == 0 ? false : true}
            style={
              isDesktop
                ? { background: "#413F3C" }
                : { background: "#413F3C", width: "90px", height: "35px" }
            }
          >
            1
          </Button>
          <Button
            className="betting-values"
            // onClick={() => onBettingClick(2)}
            disabled={gameState == 0 ? false : true}
            style={
              isDesktop
                ? { background: "#413F3C" }
                : { background: "#413F3C", width: "90px", height: "35px" }
            }
          >
            2
          </Button>
        </Box>
        {!isDesktop && (
          <>
            <Box
              className="settings-text"
              style={{ marginTop: "20px", marginBottom: "5px" }}
            >
              <span
                className={
                  themeBlack ? "setting-amount" : "setting-amount-mobile"
                }
              >
                Number of bombs : {mineAmount}
              </span>
              <span>&nbsp;</span>
            </Box>
            <Box
              justifyContent="space-between"
              className="betting-values-group-mobile"
              sx={{
                display: isDesktop ? "flex" : "grid !important",
                gridTemplateRows: "repeat(1, auto)",
                gridTemplateColumns: "repeat(4, auto)",
                rowGap: 1,
              }}
            >
              <Button
                className="bomb-amounts"
                onClick={(e) => onBNumberClick(e, 5)}
                disabled={gameState == 0 ? false : true}
                style={isDesktop ? {} : { width: "70px", height: "25px" }}
              >
                5
              </Button>
              <Button
                className="bomb-amounts"
                onClick={(e) => onBNumberClick(e, 10)}
                disabled={gameState == 0 ? false : true}
                style={isDesktop ? {} : { width: "70px", height: "25px" }}
              >
                10
              </Button>
              <Button
                className="bomb-amounts"
                onClick={(e) => onBNumberClick(e, 15)}
                disabled={gameState == 0 ? false : true}
                style={isDesktop ? {} : { width: "70px", height: "25px" }}
              >
                15
              </Button>
              <Button
                className="bomb-amounts"
                onClick={(e) => onBNumberClick(e, 24)}
                disabled={gameState == 0 ? false : true}
                style={
                  isDesktop
                    ? {}
                    : {
                        width: "70px",
                        height: "25px",
                        textTransform: "capitalize",
                      }
                }
              >
                <img className="control-option-image" src={mineamountsetting} />
              </Button>
            </Box>
          </>
        )}
      </Grid>
      <Grid
        className="messaging-container"
        xs={1}
        sm={2}
        md={3}
        lg={4}
        sx={{ display: isDesktop ? "block" : "none!important" }}
      >
        {/*<a href="https://discord.com/channels/1001809381446393886/1001811649415626752">*/}
          <img
            className="message-link"
            src={messaging}
            onClick={onClickDiscordMsg}
          />
        {/*</a>*/}
      </Grid>
      <Modal
        disableEnforceFocus
        open={modalOpen}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style} sm={stylemobile} lg={stylemobile} md={stylemobile}>
          <Grid>
            <Typography
              id="modal-modal-title"
              variant="h6"
              component="h2"
              style={themeBlack ? { color: "#fff" } : { color: "#000" }}
            >
              Number of Mines : {mineSliderAmount}
            </Typography>
          </Grid>
          <Grid>
            <Slider
              defaultValue={mineAmount}
              min={5}
              max={24}
              aria-label="Default"
              valueLabelDisplay="auto"
              style={{ color: "#F7BE44" }}
              onChange={handleSliderChange}
            />
          </Grid>
          <Button
            variant="contained"
            style={{
              marginTop: "10px",
              color: "#000",
              backgroundColor: "#F7BE44",
            }}
            onClick={onClickCloseButton}
          >
            OK
          </Button>
        </Box>
      </Modal>
      <Modal
        open={playModalOpen}
        onClose={handlePlayModalClose}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box sx={style}>
          <h1 id="parent-modal-title" style={{ color: "#fff" }}>
            Your Betting Info
          </h1>
          <p id="parent-modal-description" style={{ color: "#fff" }}>
            <span>Mine Amount : </span>
            <span style={{ color: "#F7BE44" }}>{mineAmount} </span>
          </p>
          <p id="parent-modal-description" style={{ color: "#fff" }}>
            <span>Betting Amount : </span>
            <span style={{ color: "#F7BE44" }}>{bettingAmount}</span>
            <span> SOL </span>
          </p>

          <Button
            variant="contained"
            style={{
              marginTop: "10px",
              color: "#000",
              backgroundColor: "#F7BE44",
            }}
            onClick={onClickStartGame}
            fontSize="10px"
          >
            START GAME
          </Button>
        </Box>
      </Modal>
      <Modal
        open={connectWalletModalOpen}
        onClose={handleConnectWalletModalClose}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box sx={style}>
          <h2 id="parent-modal-title" style={{ color: "#fff" }}>
            Please connect your Wallet
          </h2>
        </Box>
      </Modal>
      <Modal
        open={stopModalOpen}
        onClose={handleStopModalClose}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box sx={styleStop}>
          <Typography color="#F7BE44" fontSize="70px" fontFamily="Mada">
            x{parseFloat(multi.toFixed(3))}
          </Typography>

          <Grid container style={{ textAlign: "center" }}>
            <Grid item xs={12}>
              <img className="claimEmotion" src={claimEmotion}></img>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid item xs={12}>
              <span style={themeBlack ? { color: "#fff" } : { color: "#000" }}>
                You Won{" "}
              </span>
              <span style={{ color: "#F7BE44" }}>
                {/* {parseFloat(
                  (previousMultiplier * houseEdge * bettingAmount).toFixed(3)
                )} */}
                {parseFloat((multi * bettingAmount).toFixed(3))}
              </span>
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
        open={discordModalOpen}
        onClose={handleDiscordModalClose}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box sx={styleDiscord}>
          <iframe
            src="http://twitter.com/intent/tweet?text=I%27m%20supporting%20wellbeing%20in%20web3%20%F0%9F%A4%8D%20%0A%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20Let%27s%20unite%20to%20take%20better%20care%20of%20our%20individual%20%26%20collective%20minds%20%0A%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20https%3A%2F%2Fopenletter.momentsofspace.com%20%0A%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20Signed%3A%200xFf1A8153Dc6B8d42aC7C57b76085a921e4911004%20%0A%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20https%3A%2F%2Fwww.momentsofspace.com%2F%20%0A%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20&url=https://www.momentsofspace.com/"
            width="350"
            height="500"
            allowtransparency="true"
            frameborder="0"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          ></iframe>
        </Box>
      </Modal>
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
  );
};

export default BettingPanel;
