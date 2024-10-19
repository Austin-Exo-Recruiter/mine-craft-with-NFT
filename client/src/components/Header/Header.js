import { Box, Button, Modal, Typography, Grid, TextField } from "@mui/material";
import { useState } from "react";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import coin from "../../assets/images/coin.png";
import speaker from "../../assets/images/speaker.png";
import speaker_blacktheme from "../../assets/images/speaker_blacktheme.png";
import speaker_mute from "../../assets/images/speaker_mute.png";
import speaker_mute_blacktheme from "../../assets/images/speaker_mute_blacktheme.png";
import scale from "../../assets/images/scale.png";
import scale_blacktheme from "../../assets/images/scale_blacktheme.png";
import chart from "../../assets/images/chart.png";
import chart_blacktheme from "../../assets/images/chart_blacktheme.png";
import "./Header.scss";
import yellowrectangle from "../../assets/images/yellowrectangle.png";
import rectangleImage from "../../assets/images/rectangle.png";
import useGameStore from "../../GameStore";
import axios from "axios";
import {
  getParsedNftAccountsByOwner,
  isValidSolanaAddress,
  createConnectionConfig,
} from "@nfteyez/sol-rayz";
import {
  WalletMultiButton,
  useWalletModal,
  WalletDisconnectButton,
} from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, Link } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as solanaWeb3 from "@solana/web3.js";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { NavLink } from "react-router-dom";

// import playgame_sound from "../../assets/audios/PlayGame.mp3";
import playgame_sound from "../../assets/audios/MinesClickSound.mp3";

import useSound from "use-sound";
import { borderRadius } from "@mui/system";
// import { createConnectionConfig } from "@nfteyez/sol-rayz";
// import AvatarUpload from "./AvatarUpload";

library.add(fas);
const Header = () => {
  const theme = useTheme();
  const matchUpSm = useMediaQuery(theme.breakpoints.up("sm"));
  const [solAmountState, setSolAmountState] = useState(0);
  const { solAmount, setSolAmount } = useGameStore();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { isMuted, setIsMuted } = useGameStore();
  const { userName, setUserName } = useGameStore();
  const [suserName, setSUserName] = useState(userName);
  const [playgamesoundplay] = useSound(playgame_sound);
  const [connectWalletModalOpen, setConnectWalletModalOpen] = useState(false);
  const [nftAvatar, setNftAvatar] = useState("none");
  const { nftAvatars, setNftAvatars } = useGameStore();
  const [avatarLoading, setAvatarLoading] = useState(false);
  const { themeBlack, setThemeBlack } = useGameStore();

  const {
    ready,
    connected,
    connecting,
    disconnecting,
    select,
    connect,
    disconnect,
  } = useWallet();
  const { setVisible } = useWalletModal();

  const [gameOverModalOpen, setGameOverModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarSelected, setAvatarSelected] = useState(-1);

  const { bettingAmount, setBettingAmount } = useGameStore();
  const onClickScale = () => {
    setGameOverModalOpen(true);
  };

  const handleGameOverModalClose = () => {
    setGameOverModalOpen(false);
  };

  const handleAvatarModalClose = () => {
    setGameOverModalOpen(false);
  };

  useEffect(() => {
    const ttt = async () => {
      if (connected) {
        const connection = new solanaWeb3.Connection(
          process.env.REACT_APP_QUICK_NODE
        );
        let balance = await connection.getBalance(publicKey);
        balance = balance / LAMPORTS_PER_SOL;

        setSolAmountState(balance);
        setSolAmount(balance);
      }
      const body = {
        walletAddress: publicKey.toBase58(),
      };
      await axios
        .post(`${process.env.REACT_APP_BACKEND_URL}/api/getUserData`, body)
        .then((res) => {
          setSUserName(res.data.userName);
          setUserName(res.data.userName);
          if (typeof res.data.avatarURL == "string") {
            setNftAvatar(res.data.avatarURL);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    };

    ttt();
  }, [connected]);

  const solWallet = () => {
    if (!connected) {
      return (
        <WalletMultiButton
          className={
            themeBlack
              ? "wallet-adapter-button-trigger-black"
              : "wallet-adapter-button-trigger"
          }
        />
      );
    } else if (connected) {
      return (
        <WalletDisconnectButton
          className={
            themeBlack
              ? "wallet-adapter-button-trigger-black"
              : "wallet-adapter-button-trigger"
          }
        />
      );
    }
  };

  const onVolumeClick = () => {
    playgamesoundplay();
    setIsMuted(!isMuted);
  };

  const handleProfileModalClose = () => {
    setProfileModalOpen(false);
  };

  const onClickProfile = () => {
    if (!connected) {
      setConnectWalletModalOpen(true);
      return;
    }
    setProfileModalOpen(true);
  };

  const handleConnectWalletModalClose = () => {
    setConnectWalletModalOpen(false);
  };

  const handleSaveUser = () => {
    setUserName(suserName);
    saveUserName();
    setProfileModalOpen(false);
  };

  const handleNameChange = (e) => {
    setSUserName(e.target.value);
  };

  const saveUserName = async () => {
    const body = {
      walletAddress: publicKey.toBase58(),
      userName: suserName,
    };
    await axios
      .post(`${process.env.REACT_APP_BACKEND_URL}/api/saveUser`, body)
      .then((res) => {})
      .catch((err) => {
        console.log(err);
      });
  };

  const onClickChangeAvatar = async () => {
    setAvatarModalOpen(true);
    setAvatarLoading(true);
    let nftData = await getAllNftData();
    var data = Object.keys(nftData).map((key) => nftData[key]);

    const arr = [];
    let n = data.length;
    for (let i = 0; i < n; i++) {
      let val = await axios.get(data[i].data.uri);
      arr.push(val);
    }
    // nftAvatars = arr;
    setNftAvatars(arr);
  };

  const getAllNftData = async () => {
    try {
      const connect = createConnectionConfig(
        solanaWeb3.clusterApiUrl("mainnet-beta")
      );
      let ownerToken = publicKey;
      const result = isValidSolanaAddress(ownerToken);
      const nfts = await getParsedNftAccountsByOwner({
        publicAddress: ownerToken,
        connection: connect,
        serialization: true,
      });
      return nfts;
    } catch (error) {
      console.log(error);
    }
  };

  const onClickAvatar = (key) => {
    setAvatarSelected(key);
  };

  const onClickStats = () => {};

  const avatars = nftAvatars.map((item, key) => {
    return (
      <>
        <Grid>
          <img
            className={
              avatarSelected == key ? "avatar-image active" : "avatar-image"
            }
            src={item.data.image}
            onClick={() => onClickAvatar(key)}
          />
        </Grid>
      </>
    );
  });

  const onClickCloseAvatarSelectModal = () => {
    setAvatarModalOpen(false);
  };

  const onClickSelectAvatar = () => {
    if (avatarSelected == -1) return;
    setNftAvatar(nftAvatars[avatarSelected].data.image);
    const body = {
      walletAddress: publicKey,
      avatarURL: nftAvatars[avatarSelected].data.image,
    };
    axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/setAvatar`, body);
    setAvatarModalOpen(false);
  };

  const onClickLight = () => {
    if (themeBlack) setThemeBlack(false);
    else setThemeBlack(true);
  };

  const navbarItemClass = () =>
    themeBlack ? "navbar-item-black" : "navbar-item";

  return (
    <>
      <Box className="navbar">
        <Box
          className="navlinks navbar-group"
          sx={{
            width: matchUpSm ? "initial" : "100%",
            justifyContent: matchUpSm ? "center" : "space-around!important",
          }}
        >
          <a href="#test" className="recent-link">
            <Button className={navbarItemClass()}>RECENT</Button>
          </a>
          <NavLink className="recent-link" to="/leaderboard">
            <Button className={navbarItemClass()} onClick={onClickStats}>
              STATS&nbsp;
              <img
                className="control-option-image"
                src={themeBlack ? chart_blacktheme : chart}
              />
            </Button>
          </NavLink>

          {solWallet()}
          <img
            className="balance-image"
            src={nftAvatar == "none" ? coin : nftAvatar}
            onClick={onClickProfile}
          />
        </Box>
        {matchUpSm && (
          <Box
            className="control-options navbar-group"
            sx={{ display: { ms: "none", md: "block" } }}
          >
            <Button className={navbarItemClass()} onClick={onVolumeClick}>
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
            <Button className={navbarItemClass()} onClick={onClickScale}>
              <img
                className="control-option-image"
                src={themeBlack ? scale_blacktheme : scale}
              />
            </Button>
            <Button className={navbarItemClass()} onClick={onClickLight}>
              {themeBlack ? "LIGHT" : "DARK"}
            </Button>
          </Box>
        )}
      </Box>
      <span className={themeBlack ? "sol-balance-black" : "sol-balance"}>
        SOL {parseFloat(solAmount.toFixed(3))}
      </span>
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
                unquestionable since we use cryptography to make sure every bet
                is transparently fair and can be checked.
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
        open={profileModalOpen}
        onClose={handleProfileModalClose}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box
          className="header-profile-box"
          sx={profileModal}
          style={
            themeBlack
              ? { backgroundColor: "#101112" }
              : { backgroundColor: "#fff" }
          }
        >
          <Typography
            variant="h3"
            component="h2"
            color="#F7BE44"
            fontSize="40px"
            fontFamily="Mada"
            marginTop="20px"
          >
            USER PROFILE
          </Typography>
          <Grid>
            <img
              className="balance-image-profile"
              src={nftAvatar == "none" ? coin : nftAvatar}
              onClick={onClickProfile}
            />
          </Grid>
          <Grid style={{ margin: "20px" }}>
            <Button className="btn-change-avatar" onClick={onClickChangeAvatar}>
              {" "}
              Change Avatar
            </Button>
          </Grid>
          <Grid>
            <input
              style={{
                width: "200px",
                height: "40px",
                borderRadius: "5px",
                fontSize: "25px",
                borderColor: "#101112",
                outlineColor: "#F7BE44",
                textAlign: "center",
                opacity: "80%",
              }}
              value={suserName}
              onChange={handleNameChange}
            ></input>
          </Grid>
          <Grid>
            <Button className="btn-change-avatar" onClick={handleSaveUser}>
              Save
            </Button>
          </Grid>
        </Box>
      </Modal>

      <Modal
        open={avatarModalOpen}
        onClose={handleAvatarModalClose}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box
          className="header-profile-box"
          sx={avatarModal}
          style={
            themeBlack
              ? { backgroundColor: "#101112" }
              : { backgroundColor: "#fff" }
          }
        >
          <Typography
            variant="h3"
            component="h2"
            color="#F7BE44"
            fontSize="40px"
            fontFamily="Mada"
            marginTop="30px"
            marginBotton="20px"
          >
            Select Avatar
          </Typography>
          <div className="avatar-view">{avatars}</div>

          <Grid style={{ marginTop: "20px", marginBottom: "0px" }}>
            <Button className="btn-change-avatar" onClick={onClickSelectAvatar}>
              Select Avatar
            </Button>
          </Grid>
          <Grid style={{ margin: "0px" }}>
            <Button
              className="btn-change-avatar"
              onClick={onClickCloseAvatarSelectModal}
            >
              Cancel
            </Button>
          </Grid>
          {/* <Grid>
            <input
              style={{
                width: "200px",
                height: "40px",
                borderRadius: "5px",
                fontSize: "25px",
                borderColor: "#101112",
                outlineColor: "#F7BE44",
                textAlign: "center",
                opacity: "80%",
              }}
              value={suserName}
              onChange={handleNameChange}
            ></input>
          </Grid>
          <Grid>
            <Button className="btn-change-avatar" onClick={handleSaveUser}>
              Save
            </Button>
          </Grid> */}
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
    </>
  );
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
  // border: "2px solid #000",
  borderRadius: "10px",
  boxShadow: 24,
  p: 4,
  padding: "0px",
};

const profileModal = {
  textAlign: "center",
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "270px",
  height: "400px",
  bgcolor: "background.paper",
  // border: "2px solid #000",
  borderRadius: "10px",
  // boxShadow: 24,
  p: 4,
  padding: "0px",
};

const avatarModal = {
  textAlign: "center",
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "270px",
  height: "350px",
  bgcolor: "background.paper",
  borderRadius: "10px",
  p: 4,
  padding: "10px",
};

const walletButtonStyle = {
  backgroundColor: "#fff",
  color: "#fff",
  height: "39px",
  fontSize: "10px",
};

const style = {
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
};

export default Header;
