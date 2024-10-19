import create from "zustand";
import produce from "immer";

const useGameStore = create((set) => ({
  walletAddress: "0x12345",
  boardState: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  boardClickedState: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  nftAvatar: "none",
  themeBlack: true,
  nftAvatars: [],
  is_backgroundmusic: false,
  gameStep: 0,
  solanaTps: 2835,
  solAmount: 0,
  socket: undefined,
  userName: "MinesRush",
  solAmount: 0,
  nextMultiplier: 1,
  previousMultiplier: 1,
  isMuted: true, // if true volume one, if false volume is off
  gameHistory: [
    {
      game: "MinesRush",
      player: "Ogur",
      wager: 0.25,
      payout: 4.25,
    },
    {
      game: "Guck",
      player: "Onur",
      wager: 0.8,
      payout: 9.25,
    },
  ],
  walletAddressList: [],
  setNetGainList: [],
  bettingAmount: 0.05,
  mineAmount: 5,
  houseEdge: 0.92,
  gameState: 0, // 0:before start, 1 : now playing,
  setNextMultiplier: (val) => {
    set({ nextMultiplier: val });
  },
  setPreviousMultiplier: (val) => {
    set({ previousMultiplier: val });
  },
  setGameStep: (val) => {
    set({ gameStep: val });
  },
  setGameState: (val) => {
    set({ gameState: val });
  },
  setMineAmount: (val) => {
    set({ mineAmount: val });
  },
  setBettingAmount: (val) => {
    set({ bettingAmount: val });
  },
  setWalletAddress: (value) => {
    set({ wallletAddress: value });
  },
  setBoardState: (value) => {
    set({ boardState: value });
  },
  setBoardClickedState: (val) => {
    set({ boardClickedState: val });
  },
  setGameHistory: (value) => {
    set({ gameHistory: value });
  },
  setSolAmount: (val) => {
    set({ solAmount: val });
  },
  setIsMuted: (val) => {
    set({ isMuted: val });
  },
  setSolanaTps: (val) => {
    set({ solanaTps: val });
  },
  setSocket: (value) => {
    set({ socket: value });
  },
  setUserName: (val) => {
    set({ userName: val });
  },
  setNftAvatar: (val) => {
    set({ nftAvatar: val });
  },
  setNftAvatars: (val) => {
    set({ nftAvatars: val });
  },
  setThemeBlack: (val) => {
    set({ themeBlack: val });
  },
  setWalletAddressList: (val) => {
    set({ walletAddressList: val });
  },
  setNetGainList: (val) => {
    set({ setNetGainList: val });
  },
  setIs_backgroundMusic: (val) => {
    set({ is_backgroundmusic: val });
  },
  setSolAmount: (val) => {
    set({ solAmount: val });
  },
}));

export default useGameStore;
