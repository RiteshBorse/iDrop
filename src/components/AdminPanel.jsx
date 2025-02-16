import React , { useState, useEffect } from "react"
import { db } from "../config/firebase"
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore"
import { Line, Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const AdminPanel = () => {
  const [activeUsers, setActiveUsers] = useState(0)
  const [totalTransfers, setTotalTransfers] = useState(0)
  const [transferHistory, setTransferHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const copyCollectionRef = collection(db, "database")
        const analyticsRef = collection(db, "analytics")
        
        // Get active users (transfers in the last 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
        const activeQuery = query(
          analyticsRef,
          where("timestamp", ">=", Timestamp.fromDate(tenMinutesAgo)),
          orderBy("timestamp", "desc")
        )
        const activeData = await getDocs(activeQuery)
        
        // Count unique transfer IDs in the last 10 minutes
        const uniqueUsers = new Set(
          activeData.docs
            .map(doc => doc.data().transferId)
            .filter(Boolean)
        )
        setActiveUsers(uniqueUsers.size)

        // Get transfer history
        const historyQuery = query(
          analyticsRef, 
          orderBy("timestamp", "desc")
        )
        const historyData = await getDocs(historyQuery)
        const history = historyData.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        setTransferHistory(history)
        setTotalTransfers(history.length)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching analytics:", error)
        setIsLoading(false)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Calculate daily active users
  const getDailyActiveUsers = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayUsers = new Set(
      transferHistory
        .filter(transfer => {
          const transferDate = transfer.timestamp?.toDate()
          return transferDate >= today
        })
        .map(transfer => transfer.transferId)
        .filter(Boolean)
    )
    
    return todayUsers.size
  }

  // Function to group transfers by date and count them
  const getTransfersByDate = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      return date
    }).reverse()

    const transferCounts = last7Days.map(date => {
      const nextDay = new Date(date)
      nextDay.setDate(date.getDate() + 1)

      const count = transferHistory.filter(transfer => {
        const transferDate = transfer.timestamp?.toDate()
        return transferDate >= date && transferDate < nextDay
      }).length

      return {
        date,
        count
      }
    })

    return transferCounts
  }

  const chartData = {
    labels: getTransfersByDate().map(item => 
      item.date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    ),
    datasets: [{
      label: 'Transfers per Day',
      data: getTransfersByDate().map(item => item.count),
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
      backgroundColor: 'rgba(75, 192, 192, 0.2)'
    }]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Daily Transfers (Last 7 Days)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-800 mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Active Users (10m)</h2>
          <p className="text-3xl font-bold text-blue-500">{activeUsers}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Daily Active Users</h2>
          <p className="text-3xl font-bold text-blue-500">{getDailyActiveUsers()}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Total Transfers</h2>
          <p className="text-3xl font-bold text-blue-500">{totalTransfers}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Success Rate</h2>
          <p className="text-3xl font-bold text-green-500">
            {Math.round((transferHistory.filter(t => t.success).length / totalTransfers) * 100) || 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Transfer History</h2>
          <Line data={chartData} options={chartOptions} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Transfers</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {transferHistory.slice(0, 5).map((transfer, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">
                      {transfer.timestamp?.toDate().toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      {transfer.type === 'file' ? 'File' : 'Text'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        transfer.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transfer.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel 