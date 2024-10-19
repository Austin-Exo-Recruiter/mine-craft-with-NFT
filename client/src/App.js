import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import backgroundmusic from "./assets/audios/CoinSound.mp3";
import backgroundmusicc from "./assets/audios/backgroundmusic.mp3";

import {
  GlowWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import GamePlay from "./pages/GamePlay";
import Leaderboard from "./pages/Leaderboard";
import { Container, Box } from "@mui/material";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Sound from "react-sound";

import { useMemo, useEffect, useState } from "react";

import useGameStore from "./GameStore";
import "@fontsource/mada";
import { useNavigate } from "react-router-dom";
import ReactAudioPlayer from "react-audio-player";
import useSound from "use-sound";

require("@solana/wallet-adapter-react-ui/styles.css");

function App({ socket }) {
  const { isMuted, setIsMuted } = useGameStore();
  const [is_backgroundmusic, setIs_backgroundMusic] = useState(false);
  const [bgmusic] = useSound(backgroundmusicc, {
    volume: isMuted ? 1 : 0,
    loop: true,
  });

  const solNetwork = "mainnet-beta";
  const endpoint = process.env.REACT_APP_QUICK_NODE;

  useEffect(() => {
    document.addEventListener("click", click);
  }, []);

  const click = () => {
    if (is_backgroundmusic) return;
    setIs_backgroundMusic(true);
  };
  // initialise all the wallets you want to use
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new GlowWalletAdapter(),
      new SlopeWalletAdapter(),
      new SolflareWalletAdapter({ solNetwork }),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolletExtensionWalletAdapter(),
      new SolletWalletAdapter(),
    ],
    [solNetwork]
  );

  const handleSongFinishedPlaying = () => {
    bgmusic();
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <Container className="App" disableGutters={true} maxWidth={false}>
            <Router>
              <Routes>
                <Route path={"/"} element={<GamePlay socket={socket} />} />
                <Route path={"/leaderboard"} element={<Leaderboard />} />
              </Routes>
            </Router>
          </Container>

          <Router>
            <Routes></Routes>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
      <Sound
        url={backgroundmusic}
        playStatus={
          isMuted && is_backgroundmusic
            ? Sound.status.PLAYING
            : Sound.status.STOPPED
        }
        playFromPosition={0}
        volume={0}
        onFinishedPlaying={handleSongFinishedPlaying}
      />
    </ConnectionProvider>
  );
}

export default App;
