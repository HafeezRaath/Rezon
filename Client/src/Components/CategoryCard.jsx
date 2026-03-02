import React from 'react';
import { useNavigate } from 'react-router-dom';

const CategoryCard = ({ title, Icon, iconColor, bgColor, link }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => link && navigate(link)}
      className={`cursor-pointer rounded-xl p-4 w-full shadow-md ${bgColor} hover:shadow-lg transition flex flex-col justify-between items-center h-40`}
    >
      <Icon className={`text-5xl ${iconColor}`} />
      <h3 className="font-semibold text-sm text-center mt-4">{title}</h3>
    </div>
  );
};

export default CategoryCard;
