import React from 'react';
import Card from '../ui/Card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></span>
          {payload[0].name}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Porcentaje: <span className="font-bold text-gray-800">{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const CourseCollectionsChart = ({ data }) => {
  return (
    <Card className="flex flex-col h-[400px]">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">Distribución de cobros por nivel educativo</h3>
        <p className="text-sm text-gray-500">Porcentaje de recaudación por cada nivel.</p>
      </div>
      <div className="flex-1 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={2}
              dataKey="valor"
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default CourseCollectionsChart;
