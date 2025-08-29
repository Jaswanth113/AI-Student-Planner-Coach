import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QuantityStepperProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
}

const QuantityStepper: React.FC<QuantityStepperProps> = ({ value, onChange, min = 0, max }) => {
  const handleDecrement = () => {
    const newValue = Math.max(min, Math.floor(value - 1));
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = max !== undefined ? Math.min(max, Math.floor(value + 1)) : Math.floor(value + 1);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const parsedValue = parseInt(rawValue, 10);

    if (isNaN(parsedValue)) {
      onChange(0); // Or handle as per preference, e.g., keep current value
    } else {
      let newValue = parsedValue;
      if (min !== undefined) newValue = Math.max(min, newValue);
      if (max !== undefined) newValue = Math.min(max, newValue);
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-md"
        onClick={handleDecrement}
        disabled={value <= min}
      >
        -
      </Button>
      <Input
        type="text" // Use text to prevent default number input spinners
        value={Math.floor(value)}
        onChange={handleInputChange}
        className="w-16 text-center"
        readOnly // Make it read-only as per requirement, controlled by buttons
      />
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-md"
        onClick={handleIncrement}
        disabled={max !== undefined && value >= max}
      >
        +
      </Button>
    </div>
  );
};

export default QuantityStepper;
