// components/ModalPortal.jsx
import { createPortal } from "react-dom";

const ModalPortal = ({ children }) => {
  // Make sure it's only rendered in the browser
  if (typeof window === "undefined") return null;

  return createPortal(children, document.body);
};

export default ModalPortal;
