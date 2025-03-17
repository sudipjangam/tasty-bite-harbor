
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
  return (
    <div className={className} {...containerProps}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
      />
    </div>
  );
};
