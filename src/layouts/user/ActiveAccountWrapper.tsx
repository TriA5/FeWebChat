import React from 'react';
import { useParams } from 'react-router-dom';
import ActiveAccountPage from './ActiveAccountPage';

interface ActivationParams {
  email: string;
  code: string;
  [key: string]: string | undefined;
}

const ActiveAccountWrapper: React.FC = () => {
  const params = useParams<ActivationParams>();
  
  // Truyền parameters qua URL để ActiveAccountPage có thể xử lý
  React.useEffect(() => {
    if (params.email && params.code) {
      // Update URL để ActiveAccountPage có thể đọc được
      const searchParams = new URLSearchParams();
      searchParams.set('email', decodeURIComponent(params.email));
      searchParams.set('activationCode', params.code);
      
      // Thay đổi URL nhưng không reload trang
      const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [params.email, params.code]);

  return <ActiveAccountPage />;
};

export default ActiveAccountWrapper;