import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import minesticker from "../../assets/images/minesticker.png";
import { Box } from "@mui/material";
import "./Logo.scss";
const Logo = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));

  return (
    <Box className="logo-container" style={{ marginBottom: "0px", display: isDesktop? 'flex' : 'none' }}>
      <img className="logo-image" src={minesticker} />
    </Box>
  );
};

export default Logo;
