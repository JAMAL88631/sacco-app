import '../styles/globals.css'
import AppFrame from '../components/AppFrame'
import { ToastProvider } from '../components/ToastProvider'

function MyApp({ Component, pageProps }) {
  return <ToastProvider><AppFrame><Component {...pageProps} /></AppFrame></ToastProvider>
}

export default MyApp
