
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { Zap, TrendingUp, TrendingDown, Settings, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DynamicPricingEngine = () => {
  const { pricingRules, savePricingRule, isLoadingRules } = useChannelManagement();
  const [newRule, setNewRule] = useState({
    rule_name: '',
    rule_type: '',
    adjustment_type: 'percentage',
    adjustment_value: 0,
    priority: 1,
  });

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'occupancy': return 'bg-blue-100 text-blue-800';
      case 'seasonal': return 'bg-green-100 text-green-800';
      case 'demand': return 'bg-purple-100 text-purple-800';
      case 'competitor': return 'bg-orange-100 text-orange-800';
      case 'length_of_stay': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAdjustmentIcon = (value: number) => {
    return value > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  const handleCreateRule = () => {
    savePricingRule.mutate({
      ...newRule,
      trigger_condition: {},
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    });
    setNewRule({
      rule_name: '',
      rule_type: '',
      adjustment_type: 'percentage',
      adjustment_value: 0,
      priority: 1,
    });
  };

  if (isLoadingRules) {
    return <div>Loading pricing rules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <Zap className="w-6 h-6 mr-2 text-yellow-500" />
          Dynamic Pricing Engine
        </h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Pricing Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Pricing Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={newRule.rule_name}
                  onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                  placeholder="e.g., Weekend Premium"
                />
              </div>
              <div>
                <Label htmlFor="rule-type">Rule Type</Label>
                <Select value={newRule.rule_type} onValueChange={(value) => setNewRule({ ...newRule, rule_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rule type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="occupancy">Occupancy Based</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="demand">Demand Based</SelectItem>
                    <SelectItem value="competitor">Competitor Based</SelectItem>
                    <SelectItem value="length_of_stay">Length of Stay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adjustment-type">Adjustment Type</Label>
                  <Select value={newRule.adjustment_type} onValueChange={(value) => setNewRule({ ...newRule, adjustment_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                      <SelectItem value="multiply">Multiply</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="adjustment-value">Adjustment Value</Label>
                  <Input
                    id="adjustment-value"
                    type="number"
                    value={newRule.adjustment_value}
                    onChange={(e) => setNewRule({ ...newRule, adjustment_value: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="priority">Priority (1-10)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="10"
                  value={newRule.priority}
                  onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                />
              </div>
              <Button onClick={handleCreateRule} className="w-full">
                Create Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pricingRules.map((rule) => (
          <Card key={rule.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">
                {rule.rule_name}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Switch checked={rule.is_active} />
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Badge className={getRuleTypeColor(rule.rule_type)}>
                    {rule.rule_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <span className="text-sm font-medium">
                    Priority: {rule.priority}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Adjustment:</span>
                  <div className="flex items-center space-x-1">
                    {getAdjustmentIcon(rule.adjustment_value)}
                    <span className={`font-medium ${rule.adjustment_value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rule.adjustment_value > 0 ? '+' : ''}{rule.adjustment_value}
                      {rule.adjustment_type === 'percentage' ? '%' : '₹'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {rule.valid_from && rule.valid_to && (
                    <div>
                      Valid: {new Date(rule.valid_from).toLocaleDateString()} - {new Date(rule.valid_to).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pricing Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Impact Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {pricingRules.filter(r => r.is_active).length}
              </div>
              <div className="text-sm text-gray-500">Active Rules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                +{pricingRules.filter(r => r.adjustment_value > 0).length}
              </div>
              <div className="text-sm text-gray-500">Price Increases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                -{pricingRules.filter(r => r.adjustment_value < 0).length}
              </div>
              <div className="text-sm text-gray-500">Price Decreases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ₹{Math.abs(pricingRules.reduce((sum, r) => sum + (r.adjustment_type === 'fixed_amount' ? r.adjustment_value : 0), 0)).toFixed(0)}
              </div>
              <div className="text-sm text-gray-500">Fixed Adjustments</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicPricingEngine;
