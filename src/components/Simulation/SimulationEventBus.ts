import { SimTable, SimLayoutObject, SimOrder, SimStaff } from './useSimulationData';
import { SimulationCharacter } from './SimulationCharacter';
import { Point } from './isometricUtils';
import { CharacterRole } from './spriteDefinitions';

export class SimulationEventBus {
  characters: SimulationCharacter[] = [];
  kitchenLocation: Point = { x: 18, y: 9 };
  entranceLocation: Point = { x: 0, y: 14 };

  initCharacters(staff: SimStaff[], layout: SimLayoutObject[]) {
    // Find kitchen for chefs
    const kitchen = layout.find(l => l.type === 'kitchen');
    if (kitchen) {
      this.kitchenLocation = { x: kitchen.x_pos + 1, y: kitchen.y_pos + 1 };
    }

    this.characters = [];
    
    // Create staff characters
    staff.forEach((s, idx) => {
      const role = (s.role || 'staff').toLowerCase() as CharacterRole;
      let startPoint = { x: 2 + (idx * 2), y: 14 }; // Default start
      
      if (role === 'chef') {
        startPoint = { ...this.kitchenLocation };
      }
      
      this.characters.push(new SimulationCharacter(s.id, role, startPoint));
    });

    // Create ambient customers (will walk around/sit)
    for (let i = 0; i < 3; i++) {
      this.characters.push(
        new SimulationCharacter(`cust_${i}`, 'customer', { x: this.entranceLocation.x + i, y: this.entranceLocation.y - i })
      );
    }
  }

  updateState(tables: SimTable[], orders: SimOrder[]) {
    // Basic logic to make characters move based on state
    
    // 1. Waiters move to tables with active orders
    const waiters = this.characters.filter(c => c.role === 'waiter');
    let wIndex = 0;
    
    orders.forEach(order => {
      if (wIndex >= waiters.length) return;
      const waiter = waiters[wIndex];
      const table = tables.find(t => (t.name || '').toLowerCase() === (order.table_number || '').toLowerCase());
      
      if (table) {
        if (order.status === 'new') {
           // Move to table to take order
           waiter.setTarget({ x: table.x_pos - 1, y: table.y_pos });
           waiter.state = 'walk_e'; // Will auto update in setTarget but we can force it
        } else if (order.status === 'preparing') {
           // Move back to kitchen
           waiter.setTarget(this.kitchenLocation);
        } else if (order.status === 'ready') {
           // Carry food to table
           waiter.setTarget({ x: table.x_pos - 1, y: table.y_pos });
           waiter.state = 'carry_tray'; 
        }
      }
      wIndex++;
    });

    // 2. Ambient customer logic - sit at occupied tables
    const customers = this.characters.filter(c => c.role === 'customer');
    const occupiedTables = tables.filter(t => t.status === 'occupied');
    
    customers.forEach((cust, i) => {
      if (i < occupiedTables.length) {
        const table = occupiedTables[i];
        if (!cust.targetPosition && cust.position.x !== table.x_pos) {
          cust.setTarget({ x: table.x_pos, y: table.y_pos });
        }
        // If arrived, sit
        if (Math.abs(cust.position.x - table.x_pos) < 0.5 && Math.abs(cust.position.y - table.y_pos) < 0.5) {
          cust.state = 'sit';
        }
      } else {
        // Just wander around entrance
        if (!cust.targetPosition && Math.random() < 0.01) {
           cust.setTarget({ 
             x: this.entranceLocation.x + Math.floor(Math.random() * 4), 
             y: this.entranceLocation.y - Math.floor(Math.random() * 4) 
           });
        }
      }
    });
    
    // 3. Chefs cook if there are preparing orders
    const chefs = this.characters.filter(c => c.role === 'chef');
    const hasPreparing = orders.some(o => o.status === 'preparing');
    chefs.forEach(chef => {
       chef.state = hasPreparing ? 'cook' : 'idle';
       // small random movement in kitchen
       if (hasPreparing && !chef.targetPosition && Math.random() < 0.05) {
          chef.setTarget({
             x: this.kitchenLocation.x + (Math.random() * 2 - 1),
             y: this.kitchenLocation.y + (Math.random() * 2 - 1)
          });
       }
    });
  }

  tick(deltaTime: number) {
    this.characters.forEach(c => c.update(deltaTime));
  }

  resetForReplay() {
    this.characters.forEach(c => {
      c.targetPosition = null;
      if (c.role === 'chef') {
        c.position = { ...this.kitchenLocation };
      } else {
        c.position = { ...this.entranceLocation };
      }
      c.state = 'idle';
    });
  }

  applySnapshot(snapshot: any, tables: SimTable[]) {
    // Quick wrapper to use existing update logic with snapshot data
    // Convert snapshot activeOrders to SimOrder format
    const orders = snapshot.activeOrders.map((o: any) => ({
      id: o.id,
      table_number: o.table_number,
      status: o.status
    }));

    // Convert snapshot tableStatuses to temporary tables array
    const snapTables = tables.map(t => ({
      ...t,
      status: snapshot.tableStatuses[t.name] || 'available'
    }));

    this.updateState(snapTables, orders);
  }
}
