import { SvgIcon } from "@mui/material";
import React, { useContext } from 'react';
import { ReactComponent as LogoSvg } from "../logo.svg";
import { ThemeContext } from "./ThemeContext";

interface LogoProps {
  height?: number;
}

const Logo: React.FC<LogoProps> = (props) => {
  const { darkMode } = useContext(ThemeContext);

  const toPass = {
    sx: {
      height: '100%',
      maxWidth: '100%',
      filter: `drop-shadow(0 1px 1px rgba(222, 222, 222, 0.6))`,
      fill: darkMode === true ? '#FFF' : '#877010'
    }
  };
  if (props.height && props.height > 0) {
    // @ts-ignore
    toPass.sx.fontSize = props.height;
  }


  return <SvgIcon
    {...toPass}
    component={LogoSvg}
    viewBox="0 0 591.7 693.3"
    inheritViewBox
  />
};

export default Logo;


