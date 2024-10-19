import { Box, Grid, Divider } from "@mui/material";
import twitter from "../../assets/images/twitter.png";
import discord from "../../assets/images/discord.png";
import magiceden from "../../assets/images/magiceden.png";
import bomb from "../../assets/images/bomb.png";
import axe from "../../assets/images/axe.png";
import "./Footer.scss";
import { useEffect } from "react";
import * as web3 from "@solana/web3.js";
import useGameStore from "../../GameStore";

// responsive design
import useMediaQuery from "@mui/material/useMediaQuery";

const Footer = () => {
  const { solanaTps, setSolanaTps } = useGameStore();

  useEffect(() => {
    getSolTPS();
  }, []);

  const getSolTPS = async () => {
    const solana = new web3.Connection(process.env.REACT_APP_QUICK_NODE);
    const perfSample = await solana.getRecentPerformanceSamples(1);
    setSolanaTps(
      parseInt(perfSample[0].numTransactions / perfSample[0].samplePeriodSecs)
    );
  };

  const isDesktop = useMediaQuery("(min-width:1200px)");
  return (
    <Grid className="footer-container" container>
      {isDesktop && <Divider className="footer-divider" />}
      <Grid xs={3} />
      <Grid xs={6} className="footer-grid">
        <Box>
          <Grid container spacing={isDesktop ? 4 : 2}>
            <Grid className="footer-items" xs={isDesktop ? 4 : 12}>
              {isDesktop && (
                <a href="https://minesrush.com" target="_blank">
                  <img className="footer-icons" src={bomb} />
                </a>
              )}
              <a href="https://discord.com/invite/C84Udhnv4j" target="_blank">
                <img className="footer-icons" src={discord} />
              </a>
              <a href="https://twitter.com/MinesRushNFT" target="_blank">
                <img className="footer-icons" src={twitter} />
              </a>
              <a
                href="https://magiceden.io/marketplace/mines_rush"
                target="_blank"
              >
                <img className="footer-icons" src={magiceden} />
              </a>
            </Grid>
            {isDesktop && (
              <Grid className="footer-items" xs={4}>
                <span className={isDesktop ? "copyright" : "copyright-mobile"}>
                  Copyright © 2024 Exo Agency
                </span>
              </Grid>
            )}
            <Grid className="footer-items" xs={isDesktop ? 4 : 12}>
              <span
                className={isDesktop ? "solana-speed" : "solana-speed-mobile"}
              >
                <img src={axe} />
                Solana Network: {solanaTps} TPS
              </span>
            </Grid>
          </Grid>
        </Box>
      </Grid>
      <Grid xs={3} />
    </Grid>
  );
};

export default Footer;
