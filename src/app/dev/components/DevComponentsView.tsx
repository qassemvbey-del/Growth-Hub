"use client";

import React from 'react';
import Shape from '@/components/m3/Shape';
import Icon from '@/components/m3/Icon';
import Button from '@/components/m3/Button';
import Chip from '@/components/m3/Chip';
import CheckCircle from '@/components/m3/CheckCircle';
import WavyProgress from '@/components/m3/WavyProgress';
import { ListGroup, ListItem } from '@/components/m3/ListGroup';
import TaskRow from '@/components/m3/TaskRow';
import TextField from '@/components/m3/TextField';
import Switch from '@/components/m3/Switch';
import SegmentedButtons from '@/components/m3/SegmentedButtons';

export default function DevComponentsView() {
  return (
    <div className="min-h-screen p-8 flex flex-col gap-16 font-arabic" dir="rtl">
      
      {/* Dark Theme Section */}
      <section className="dark flex flex-col gap-8 p-8 bg-md-bg text-md-on rounded-card">
        <h1 className="font-readex text-2xl font-bold">M3 Components - Dark Theme</h1>
        
        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Shapes</h2>
          <div className="flex gap-4 items-center">
            <Shape type="cookie" colorToken="md-primary" />
            <Shape type="sunny" colorToken="md-tc" spin />
            <Shape type="clover" colorToken="md-xp" />
            <Shape type="flower" colorToken="md-error" />
            <Shape type="burst" colorToken="md-pc">
              <Icon name="star" filled />
            </Shape>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Buttons</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="filled">Filled Button</Button>
            <Button variant="tonal" icon="add">Tonal Button</Button>
            <Button variant="outlined">Outlined Button</Button>
            <Button variant="text">Text Button</Button>
            <Button disabled>Disabled Button</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Chips</h2>
          <div className="flex gap-4 items-center">
            <Chip selected icon="check">Selected Chip</Chip>
            <Chip icon="person">Unselected Chip</Chip>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Controls</h2>
          <div className="flex gap-8 items-center">
            <CheckCircle checked={true} onChange={() => {}} aria-label="Checked" />
            <CheckCircle checked={false} onChange={() => {}} aria-label="Unchecked" />
            <Switch checked={true} onChange={() => {}} aria-label="Switch On" />
            <Switch checked={false} onChange={() => {}} aria-label="Switch Off" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Inputs & Progress</h2>
          <div className="flex flex-col gap-4 max-w-md">
            <TextField label="Enter your name" />
            <WavyProgress value={0.7} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">List Group & Task Row</h2>
          <div className="max-w-md">
            <ListGroup>
              <ListItem>Simple List Item 1</ListItem>
              <ListItem>Simple List Item 2</ListItem>
            </ListGroup>
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <TaskRow 
              checked={false} 
              onCheck={() => {}} 
              title="Read the documentation" 
              meta="Due today" 
              xp={20} 
            />
            <TaskRow 
              checked={true} 
              onCheck={() => {}} 
              title="Completed task" 
              xp={15} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Segmented Buttons</h2>
          <div className="max-w-md">
            <SegmentedButtons 
              selectedId="2"
              onChange={() => {}}
              items={[
                { id: '1', label: 'Day' },
                { id: '2', label: 'Week', icon: 'calendar_today' },
                { id: '3', label: 'Month' }
              ]} 
            />
          </div>
        </div>
      </section>


      {/* Light Theme Section */}
      <section className="light flex flex-col gap-8 p-8 bg-md-bg text-md-on rounded-card">
        <h1 className="font-readex text-2xl font-bold">M3 Components - Light Theme</h1>
        
        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Shapes</h2>
          <div className="flex gap-4 items-center">
            <Shape type="cookie" colorToken="md-primary" />
            <Shape type="sunny" colorToken="md-tc" spin />
            <Shape type="clover" colorToken="md-xp" />
            <Shape type="flower" colorToken="md-error" />
            <Shape type="burst" colorToken="md-pc">
              <Icon name="star" filled />
            </Shape>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Buttons</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="filled">Filled Button</Button>
            <Button variant="tonal" icon="add">Tonal Button</Button>
            <Button variant="outlined">Outlined Button</Button>
            <Button variant="text">Text Button</Button>
            <Button disabled>Disabled Button</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Chips</h2>
          <div className="flex gap-4 items-center">
            <Chip selected icon="check">Selected Chip</Chip>
            <Chip icon="person">Unselected Chip</Chip>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Controls</h2>
          <div className="flex gap-8 items-center">
            <CheckCircle checked={true} onChange={() => {}} aria-label="Checked" />
            <CheckCircle checked={false} onChange={() => {}} aria-label="Unchecked" />
            <Switch checked={true} onChange={() => {}} aria-label="Switch On" />
            <Switch checked={false} onChange={() => {}} aria-label="Switch Off" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Inputs & Progress</h2>
          <div className="flex flex-col gap-4 max-w-md">
            <TextField label="Enter your name" />
            <WavyProgress value={0.7} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">List Group & Task Row</h2>
          <div className="max-w-md">
            <ListGroup>
              <ListItem>Simple List Item 1</ListItem>
              <ListItem>Simple List Item 2</ListItem>
            </ListGroup>
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <TaskRow 
              checked={false} 
              onCheck={() => {}} 
              title="Read the documentation" 
              meta="Due today" 
              xp={20} 
            />
            <TaskRow 
              checked={true} 
              onCheck={() => {}} 
              title="Completed task" 
              xp={15} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl">Segmented Buttons</h2>
          <div className="max-w-md">
            <SegmentedButtons 
              selectedId="2"
              onChange={() => {}}
              items={[
                { id: '1', label: 'Day' },
                { id: '2', label: 'Week', icon: 'calendar_today' },
                { id: '3', label: 'Month' }
              ]} 
            />
          </div>
        </div>
      </section>

    </div>
  );
}
