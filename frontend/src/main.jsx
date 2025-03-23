
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
const stripePromise = loadStripe("pk_test_51R39d2E6pLHHHOA0D1uTIcvcmwQvgZT9aKe3LNmxu9vKPbM9qyaYRjDend5eyQYRPcPF7gtAtkG9N55VeaJtibEo00b0k6Az60");
createRoot(document.getElementById('root')).render(
<Elements stripe={stripePromise}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Elements>
)
