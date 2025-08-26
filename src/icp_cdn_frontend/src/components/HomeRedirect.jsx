import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const HomeRedirect = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if not loading and user is logged in
    if (!loading && isLoggedIn) {
      navigate('/upload');
    }
  }, [isLoggedIn, loading, navigate]);

  // If loading, show nothing (or a loading spinner)
  if (loading) {
    return null;
  }

  // If logged in, don't render children (will redirect)
  if (isLoggedIn) {
    return null;
  }

  // If not logged in, show the home page content
  return children;
};

export default HomeRedirect;
