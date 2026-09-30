import React from 'react';
import Card from '../ui/Card';

const MiniStatCard = ({ title, value }) => {
  return (
    <Card className="flex flex-col gap-1 hover:shadow-md transition-shadow" noPadding>
      <div className="p-4 flex flex-col justify-center">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
    </Card>
  );
};

export default MiniStatCard;
