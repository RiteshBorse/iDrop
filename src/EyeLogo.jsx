import { motion } from "framer-motion"
import React from "react"
const EyeLogo = ({ className = "" }) => (
  <motion.svg
    className={`w-8 h-8 ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    animate={{ scale: [1, 1.1, 1] }}
    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
  >
    <motion.path
      d="M12 5C5.63636 5 2 12 2 12C2 12 5.63636 19 12 19C18.3636 19 22 12 22 12C22 12 18.3636 5 12 5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
    />
    <motion.path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1, duration: 1 }}
    />
  </motion.svg>
)

export default EyeLogo

