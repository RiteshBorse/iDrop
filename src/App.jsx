import React from "react"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { db } from "./config/firebase"
import { addDoc, collection, getDocs, deleteDoc } from "firebase/firestore"
import EyeLogo from "./EyeLogo"
import AdminPanel from "./components/AdminPanel"
import AdminLogin from "./components/AdminLogin"

const App = () => {
  const [text, setText] = useState("")
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState("")
  const [fileType, setFileType] = useState("")
  const [id, setId] = useState("")
  const [receiveId, setReceiveId] = useState("")
  const [data, setData] = useState("")
  const [activeTab, setActiveTab] = useState("send")
  const [isLoading, setIsLoading] = useState(false)
  const [foundDoc, setFoundDoc] = useState(null)
  const [cleanupStatus, setCleanupStatus] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)

  const copyCollectionRef = collection(db, "database")

  useEffect(() => {
    const getCopy = async () => {
      const data = await getDocs(copyCollectionRef)
      const filteredData = data.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    }
    getCopy()
  }, [copyCollectionRef])

  useEffect(() => {
    const deleteAllDocs = async () => {
      setCleanupStatus("Cleaning up old data...")
      const querySnapshot = await getDocs(copyCollectionRef)
      const deletePromises = querySnapshot.docs.map(async (doc) => {
        try {
          await deleteDoc(doc.ref)
        } catch (error) {
          console.error("Error deleting document:", error)
        }
      })
      await Promise.all(deletePromises)
      setCleanupStatus("Cleanup complete")
      setTimeout(() => setCleanupStatus(""), 3000) // Clear status after 3 seconds
    }

    const cleanupTimer = setTimeout(deleteAllDocs, 600000) // 10 minute

    return () => clearTimeout(cleanupTimer)
  }, [copyCollectionRef])

  const generateRandomId = async () => {
    let newId
    let isUnique = false

    while (!isUnique) {
      newId = Math.floor(1000 + Math.random() * 9000)
      const querySnapshot = await getDocs(copyCollectionRef)
      const exists = querySnapshot.docs.some((doc) => doc.data().id === newId)
      isUnique = !exists
    }

    return newId
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFileName(selectedFile.name)
      setFileType(selectedFile.type)
      const reader = new FileReader()
      reader.onload = (e) => {
        setFile(e.target.result)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleSend = async () => {
    if (!text.trim() && !file) {
      alert("Please enter some text or select a file to send.")
      return
    }
    setIsLoading(true)
    const id = await generateRandomId()
    try {
      await addDoc(copyCollectionRef, {
        data: file || text,
        fileName: fileName || null,
        fileType: fileType || null,
        isFile: !!file,
        id: id,
      })
      setId(id)
      setText("")
      setFile(null)
      setFileName("")
      setFileType("")
      setIsLoading(false)
      
      // Add detailed analytics
      await addDoc(collection(db, "analytics"), {
        timestamp: new Date(),
        type: file ? "file" : "text",
        success: true,
        count: 1,
        fileSize: file ? file.length : text.length,
        fileName: fileName || null,
        transferId: id
      })
    } catch (error) {
      console.error("Error sending data:", error)
      // Track failed transfers with details
      await addDoc(collection(db, "analytics"), {
        timestamp: new Date(),
        type: file ? "file" : "text",
        success: false,
        error: error.message,
        count: 1,
        fileSize: file ? file.length : text.length,
        fileName: fileName || null
      })
      alert("Error sending data. Please try again.")
    }
  }

  const handleReceive = async () => {
    if (!receiveId.trim()) {
      alert("Please enter an ID to receive data.")
      return
    }
    setIsLoading(true)
    try {
      const data = await getDocs(copyCollectionRef)
      const found = data.docs.find((doc) => doc.data().id.toString() === receiveId.toString())

      if (found) {
        setFoundDoc(found)
        setData(found.data().data)
        
        // Track successful receive
        await addDoc(collection(db, "analytics"), {
          timestamp: new Date(),
          type: found.data().isFile ? "file" : "text",
          success: true,
          count: 1,
          action: "receive",
          transferId: receiveId
        })
      } else {
        setFoundDoc(null)
        setData("No data found for this ID")
        
        // Track failed receive
        await addDoc(collection(db, "analytics"), {
          timestamp: new Date(),
          type: "unknown",
          success: false,
          count: 1,
          action: "receive",
          error: "ID not found",
          transferId: receiveId
        })
      }
    } catch (error) {
      console.error("Error receiving data:", error)
      // Track error in receive
      await addDoc(collection(db, "analytics"), {
        timestamp: new Date(),
        type: "unknown",
        success: false,
        count: 1,
        action: "receive",
        error: error.message,
        transferId: receiveId
      })
    }
    setIsLoading(false)
  }

  const handleCopy = async () => {
    if (!data) {
      alert("No data to copy.")
      return
    }
    try {
      await navigator.clipboard.writeText(data)
      alert("Text copied to clipboard!")
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleDownload = (base64Data, fileName, fileType) => {
    const link = document.createElement('a')
    link.href = base64Data
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const checkAdmin = (password) => {
    // Replace with your desired admin password
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAdmin(true)
      localStorage.setItem("isAdmin", "true")
    }
  }

  useEffect(() => {
    const adminStatus = localStorage.getItem("isAdmin")
    if (adminStatus === "true") {
      setIsAdmin(true)
    }
  }, [])

  // Add admin login shortcut
  useEffect(() => {
    const handleKeyPress = (e) => { 
      // Using keyCode 65 for 'A'
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.keyCode === 65) {
        setShowAdminLogin(true);
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (showAdminLogin) {
    return <AdminLogin onLogin={checkAdmin} />
  }

  if (isAdmin) {
    return <AdminPanel />
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-100 to-blue-200 p-2 sm:p-4 md:p-8 flex items-center justify-center">
      {cleanupStatus && (
        <div className="fixed top-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md shadow-md">
          {cleanupStatus}
        </div>
      )}
      <motion.div
        className="w-full h-full max-h-screen bg-white rounded-2xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="bg-blue-500 p-6 sm:p-8 flex items-center justify-center space-x-6"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
        >
          <EyeLogo className="text-white w-8 h-8 sm:w-10 sm:h-10" />
          <motion.h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            iDrop
          </motion.h1>
        </motion.div>
        <div className="p-6 sm:p-8 md:p-10">
          <motion.div
            className="flex mb-12 bg-blue-100 rounded-lg p-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <AnimatePresence mode="wait">
              <motion.button
                key={activeTab === "send" ? "send" : "receive"}
                className={`flex-1 py-2 px-4 text-center font-semibold rounded-md ${
                  activeTab === "send" ? "bg-blue-500 text-white" : "text-blue-500"
                }`}
                onClick={() => setActiveTab("send")}
                initial={{ x: activeTab === "send" ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: activeTab === "send" ? -20 : 20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                Send Data
              </motion.button>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.button
                key={activeTab === "receive" ? "receive" : "send"}
                className={`flex-1 py-2 px-4 text-center font-semibold rounded-md ${
                  activeTab === "receive" ? "bg-blue-500 text-white" : "text-blue-500"
                }`}
                onClick={() => setActiveTab("receive")}
                initial={{ x: activeTab === "receive" ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: activeTab === "receive" ? -20 : 20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                Receive Data
              </motion.button>
            </AnimatePresence>
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === "send" && (
              <motion.div
                key="send"
                className="space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence>
                  {id && (
                    <motion.div
                      className="bg-blue-100 p-4 rounded-md"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-lg font-semibold text-blue-800">
                        Your ID: <span className="font-bold">{id}</span>
                      </p>
                      <p className="text-sm text-blue-500">
                        Share this ID with the recipient to allow them to receive your data.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.input
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="text"
                  placeholder="Enter your text (optional)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                />
                <motion.input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full block text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 
                  file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 
                  file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                {file && (
                  <motion.div className="text-sm text-blue-500">
                    Selected file: {fileName}
                  </motion.div>
                )}
                <motion.button
                  className={`w-1/3 bg-blue-500 text-white py-2 px-3 sm:px-6 text-sm sm:text-base rounded-md hover:bg-blue-700 mx-auto block ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={handleSend}
                  disabled={isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLoading ? "Sending..." : "Send"}
                </motion.button>
              </motion.div>
            )}

            {activeTab === "receive" && (
              <motion.div
                key="receive"
                className="space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <motion.input
                  className="w-full px-4 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="text"
                  placeholder="Enter the ID"
                  value={receiveId}
                  onChange={(e) => setReceiveId(e.target.value)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                />
                <motion.button
                  className={`w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-700 ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={handleReceive}
                  disabled={isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLoading ? "Receiving..." : "Receive"}
                </motion.button>
                <AnimatePresence>
                  {data && (
                    <motion.div
                      className="bg-blue-100 p-4 rounded-md"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-lg font-semibold text-blue-800">Received Data:</p>
                      {foundDoc?.data().isFile ? (
                        <div>
                          <p className="text-blue-500">File: {foundDoc.data().fileName}</p>
                          <motion.button
                            className="mt-2 w-full bg-white text-blue-500 border border-blue-500 py-2 px-4 rounded-md hover:bg-blue-50"
                            onClick={() => handleDownload(data, foundDoc.data().fileName, foundDoc.data().fileType)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Download File
                          </motion.button>
                        </div>
                      ) : (
                        <>
                          <p className="text-blue-500 break-words">{data}</p>
                          <motion.button
                            className="mt-2 w-full bg-white text-blue-500 border border-blue-500 py-2 px-4 rounded-md hover:bg-blue-50"
                            onClick={handleCopy}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Copy to Clipboard
                          </motion.button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="text-center text-sm text-gray-500 pb-4">
          Made by Ritesh Borse
        </div>
      </motion.div>
    </div>
  )
}

export default App

