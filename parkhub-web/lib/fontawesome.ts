import { config, library } from "@fortawesome/fontawesome-svg-core";
import {
  faSquareParking,
  faBuilding,
  faWarehouse,
  faMicrochip,
  faCalculator,
  faChartLine,
  faListCheck,
  faDesktop,
  faCar,
  faArrowRightToBracket,
  faArrowRightFromBracket,
  faWallet,
  faUser,
  faLock,
  faMobileScreen,
  faShieldHalved,
  faRightFromBracket,
  faCircle,
  faArrowUp,
  faTriangleExclamation,
  faShop,
  faHouseChimney,
  faSpinner,
  faCheck,
  faEye,
  faEyeSlash,
  faCommentDots,
} from "@fortawesome/free-solid-svg-icons";
import {
  faUser as faUserRegular,
  faEye as faEyeRegular,
  faEyeSlash as faEyeSlashRegular,
} from "@fortawesome/free-regular-svg-icons";
import {
  faWeixin,
} from "@fortawesome/free-brands-svg-icons";

// Configure FontAwesome
config.autoAddCss = false;

// Add icons to library
library.add(
  // Solid icons
  faSquareParking,
  faBuilding,
  faWarehouse,
  faMicrochip,
  faCalculator,
  faChartLine,
  faListCheck,
  faDesktop,
  faCar,
  faArrowRightToBracket,
  faArrowRightFromBracket,
  faWallet,
  faUser,
  faLock,
  faMobileScreen,
  faShieldHalved,
  faRightFromBracket,
  faCircle,
  faArrowUp,
  faTriangleExclamation,
  faShop,
  faHouseChimney,
  faSpinner,
  faCheck,
  faEye,
  faEyeSlash,
  faCommentDots,
  // Regular icons
  faUserRegular,
  faEyeRegular,
  faEyeSlashRegular,
  // Brands
  faWeixin
);

export { config, library };
