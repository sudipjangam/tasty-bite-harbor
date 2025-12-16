import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============================================
// SHARED FIELD PROPS
// ============================================

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// ============================================
// TEXT INPUT FIELD
// ============================================

interface TextFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  min?: number;
  max?: number;
  step?: number;
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  className,
  type = 'text',
  min,
  max,
  step,
}: TextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// TEXTAREA FIELD
// ============================================

interface TextareaFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  rows?: number;
  maxLength?: number;
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  className,
  rows = 3,
  maxLength,
}: TextareaFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              maxLength={maxLength}
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// SELECT FIELD
// ============================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: SelectOption[];
  emptyText?: string;
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = 'Select an option',
  required,
  disabled,
  className,
  options,
  emptyText = 'No options available',
}: SelectFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 transition-all duration-200 text-gray-900 dark:text-white">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-xl shadow-xl max-h-[300px]">
              {options.length === 0 ? (
                <div className="text-gray-500 text-sm p-2 text-center">{emptyText}</div>
              ) : (
                options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="rounded-lg"
                  >
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// SWITCH FIELD
// ============================================

interface SwitchFieldProps<T extends FieldValues> extends Omit<BaseFieldProps<T>, 'placeholder'> {
  variant?: 'default' | 'veg' | 'special' | 'active';
}

const switchVariants = {
  default: {
    container: 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50',
    label: 'text-gray-700 dark:text-gray-300',
    switch: 'data-[state=checked]:bg-primary',
  },
  veg: {
    container: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20',
    label: 'text-green-700',
    switch: 'data-[state=checked]:bg-green-500',
  },
  special: {
    container: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20',
    label: 'text-purple-700',
    switch: 'data-[state=checked]:bg-purple-500',
  },
  active: {
    container: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20',
    label: 'text-blue-700',
    switch: 'data-[state=checked]:bg-blue-500',
  },
};

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  variant = 'default',
}: SwitchFieldProps<T>) {
  const styles = switchVariants[variant];

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            'flex flex-row items-center justify-between space-x-2 rounded-xl border p-4',
            styles.container,
            className
          )}
        >
          <div className="space-y-0.5">
            <FormLabel className={cn('text-base font-semibold', styles.label)}>
              {label}
            </FormLabel>
            {description && (
              <FormDescription className={styles.label}>
                {description}
              </FormDescription>
            )}
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              className={styles.switch}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

// ============================================
// PRICE INPUT FIELD (₹ prefix)
// ============================================

interface PriceFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  min?: number;
  max?: number;
}

export function PriceField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = '0.00',
  required,
  disabled,
  className,
  min = 0,
  max,
}: PriceFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                ₹
              </span>
              <Input
                type="number"
                step="0.01"
                min={min}
                max={max}
                placeholder={placeholder}
                disabled={disabled}
                className="pl-7 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                {...field}
                value={field.value ?? ''}
              />
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// QUANTITY INPUT FIELD
// ============================================

interface QuantityFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function QuantityField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = '0',
  required,
  disabled,
  className,
  unit,
  min = 0,
  max,
  step = 1,
}: QuantityFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                type="number"
                step={step}
                min={min}
                max={max}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  'bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  unit && 'pr-14'
                )}
                {...field}
                value={field.value ?? ''}
              />
              {unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {unit}
                </span>
              )}
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
