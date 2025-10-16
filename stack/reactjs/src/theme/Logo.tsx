import { SvgIcon } from "@mui/material";
import React, { useContext } from 'react';
import { ReactComponent as LogoSvg } from "../logo.svg";
import { ThemeContext } from "./ThemeContext";

interface LogoProps {
  height?: number;
  useCustom?: boolean;
}

const Logo: React.FC<LogoProps> = (props) => {
  const { darkMode, brandingSettings } = useContext(ThemeContext);
  const { useCustom = true } = props;

  // Get custom logo from branding settings
  const customLogoBase64 = brandingSettings?.customLogoBase64;

  // If custom logo is requested and available, render image
  if (useCustom && customLogoBase64) {
    return (
      <img
        src={customLogoBase64}
        alt="Custom Logo"
        style={{
          height: props.height ? `${props.height}px` : '100%',
          maxWidth: '100%',
          objectFit: 'contain'
        }}
      />
    );
  }

  // Otherwise render original SVG
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


