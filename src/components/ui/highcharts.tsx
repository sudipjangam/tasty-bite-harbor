
import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface HighchartProps {
  options: Highcharts.Options;
  className?: string;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const HighchartComponent: React.FC<HighchartProps> = ({ 
  options, 
  className = "",
  containerProps
}) => {
  // Ensure charts render without accessibility module and with transparent bg by default
  const mergedOptions: Highcharts.Options = {
    accessibility: { enabled: false },
    chart: { backgroundColor: 'transparent' },
    ...options,
  };

  return (
    <div className={className} {...containerProps}>
      <HighchartsReact
        highcharts={Highcharts}
        options={mergedOptions}
      />
    </div>
  );
};
