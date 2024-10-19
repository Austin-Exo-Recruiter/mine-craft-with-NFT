import Logo from "../Logo";
import GameBoard from "../GameBoard";
import BettingPanel from "../BettingPanel";
import RecentPlays from "../RecentPlays";
const Content = ({
  loading,
  setLoading,
  depositText,
  setDepositText,
  socket,
}) => {
  return (
    <>
      <Logo />
      <GameBoard socket={socket} />
      <BettingPanel
        loading={loading}
        setLoading={setLoading}
        depositText={depositText}
        setDepositText={setDepositText}
        socket={socket}
      />
      <RecentPlays socket={socket} />
    </>
  );
};

export default Content;
