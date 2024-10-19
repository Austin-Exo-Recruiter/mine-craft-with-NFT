import { useState, useEffect } from "react";
import { useMediaQuery, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Header from "../components/Header";
import Content from "../components/Content";
import Footer from "../components/Footer";
import Splash from "../components/Splash";
import background from "../assets/images/hero.png";
import background_blacktheme from "../assets/images/hero_blacktheme.png";
import useGameStore from "../GameStore";

import "./GamePlay.scss";
const GamePlay = ({ socket }) => {
  const [loading, setLoading] = useState(true);
  const [depositText, setDepositText] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));
  const { themeBlack, setThemeBlack } = useGameStore();

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }, []);
  return (
    <>
      <Box
        className={
          isDesktop
            ? "background"
            : themeBlack
            ? "background-mobile-black"
            : "background-mobile"
        }
        sx={{
          height: loading ? "100vh" : "initial",
          overflow: "hidden",
          backgroundImage: isDesktop
            ? themeBlack
              ? `url(${background_blacktheme})`
              : `url(${background})`
            : "none",
        }}
      >
        <Box className={themeBlack ? "overlay" : ""}>
          <Header />
          <Content
            loading={loading}
            setLoading={setLoading}
            depositText={depositText}
            setDepositText={setDepositText}
            socket={socket}
          />
          <Footer />
        </Box>
      </Box>
      <Splash loading={loading} depositText={depositText} />
      {/*<PlayMusic />*/}
    </>
  );
};

export default GamePlay;
