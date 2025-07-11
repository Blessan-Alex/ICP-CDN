import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Initialize Pinata SDK globally
import { PinataSDK } from 'pinata';
window.pinata = new PinataSDK({
  pinataJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyZDhiYzBiNC0xNjllLTQzNzQtOTI5Yy05ZmJhNjEwODNmMTciLCJlbWFpbCI6ImtoYXRyaXNha3NoaTMwMDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjdjN2FjMjY3YTdhMzU2ZWVmN2Y3Iiwic2NvcGVkS2V5U2VjcmV0IjoiODE2ZjMyZjk4NTFjY2Q1YzZmNjhlNjQzMDA2NjZlZGQ4MzkxMTEzY2RkMDhhMjMzNDdkZmMzY2NhMDNlOTU1NCIsImV4cCI6MTc4Mzc4MTcwOH0.Qv8HE9i-HPBOJ2jvtnrlEGnttG6kIEUQ-SaKz4AznwE",
  pinataGateway: "black-defensive-zebra-94.mypinata.cloud",
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
