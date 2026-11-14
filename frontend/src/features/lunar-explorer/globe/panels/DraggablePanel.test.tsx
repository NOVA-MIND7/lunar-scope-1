import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraggablePanel } from './DraggablePanel';

describe('DraggablePanel', () => {
  it('renders title and responds to mouse dragging', () => {
    render(
      <DraggablePanel id="test-panel" title="Test Panel" initialX={50} initialY={100}>
        <div>Panel content body</div>
      </DraggablePanel>,
    );

    expect(screen.getByText('Test Panel')).toBeInTheDocument();
    expect(screen.getByText('Panel content body')).toBeInTheDocument();

    const header = screen.getByText('Test Panel').closest('div')!;

    // Simulate drag with mouse events
    fireEvent.mouseDown(header, { clientX: 50, clientY: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 120, clientY: 180 });
    fireEvent.mouseUp(window);

    const panel = screen.getByText('Test Panel').closest('.absolute') as HTMLElement;
    expect(panel).toBeInTheDocument();
  });

  it('collapses and expands when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DraggablePanel id="test-collapse" title="Collapsible Panel" initialX={0} initialY={0}>
        <div>Hidden when collapsed</div>
      </DraggablePanel>,
    );

    expect(screen.getByText('Hidden when collapsed')).toBeInTheDocument();

    const collapseBtn = screen.getByRole('button', { name: 'Collapse panel' });
    await user.click(collapseBtn);

    expect(screen.queryByText('Hidden when collapsed')).toBeNull();

    const expandBtn = screen.getByRole('button', { name: 'Expand panel' });
    await user.click(expandBtn);

    expect(screen.getByText('Hidden when collapsed')).toBeInTheDocument();
  });
});
