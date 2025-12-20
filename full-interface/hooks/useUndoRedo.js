// useUndoRedo Hook - Track last 5 state snapshots for undo/redo
import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY_SIZE = 5;

/**
 * Hook for managing undo/redo functionality with staged state
 * @param {Object} stagedState - Current staged state
 * @param {Function} setStagedState - Function to update staged state
 * @returns {Object} - Undo/redo functions and state
 */
export function useUndoRedo(stagedState, setStagedState) {
  const [history, setHistory] = useState([]); // Past states
  const [future, setFuture] = useState([]); // Future states (for redo)
  const isUndoRedoAction = useRef(false); // Flag to prevent recording undo/redo as new action

  /**
   * Push current state to history
   * Called before user makes a change
   */
  const pushHistory = useCallback(() => {
    // Don't push if this is from undo/redo itself
    if (isUndoRedoAction.current) {
      return;
    }

    setHistory(prev => {
      const newHistory = [...prev, stagedState];
      // Keep only last MAX_HISTORY_SIZE items
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(-MAX_HISTORY_SIZE);
      }
      return newHistory;
    });

    // Clear future when new action is made
    setFuture([]);
  }, [stagedState]);

  /**
   * Undo the last action
   */
  const undo = useCallback(() => {
    if (history.length === 0) return;

    isUndoRedoAction.current = true;

    // Pop last state from history
    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    // Push current state to future
    setFuture(prev => [...prev, stagedState]);
    setHistory(newHistory);
    setStagedState(previousState);

    // Reset flag after state update
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 0);
  }, [history, stagedState, setStagedState]);

  /**
   * Redo the last undone action
   */
  const redo = useCallback(() => {
    if (future.length === 0) return;

    isUndoRedoAction.current = true;

    // Pop last state from future
    const nextState = future[future.length - 1];
    const newFuture = future.slice(0, -1);

    // Push current state to history
    setHistory(prev => [...prev, stagedState]);
    setFuture(newFuture);
    setStagedState(nextState);

    // Reset flag after state update
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 0);
  }, [future, stagedState, setStagedState]);

  /**
   * Clear all undo/redo history
   * Called when Apply or Cancel is clicked
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setFuture([]);
  }, []);

  /**
   * Get description of what will be undone
   */
  const getUndoDescription = useCallback(() => {
    if (history.length === 0) return null;

    const lastState = history[history.length - 1];
    const currentTabCount = stagedState.tabs.length;
    const lastTabCount = lastState.tabs.length;
    const currentGroupCount = stagedState.groups.length;
    const lastGroupCount = lastState.groups.length;

    if (currentTabCount !== lastTabCount) {
      return `Undo tab change`;
    }
    if (currentGroupCount !== lastGroupCount) {
      return `Undo group change`;
    }
    return `Undo last action`;
  }, [history, stagedState]);

  /**
   * Get description of what will be redone
   */
  const getRedoDescription = useCallback(() => {
    if (future.length === 0) return null;

    const nextState = future[future.length - 1];
    const currentTabCount = stagedState.tabs.length;
    const nextTabCount = nextState.tabs.length;
    const currentGroupCount = stagedState.groups.length;
    const nextGroupCount = nextState.groups.length;

    if (currentTabCount !== nextTabCount) {
      return `Redo tab change`;
    }
    if (currentGroupCount !== nextGroupCount) {
      return `Redo group change`;
    }
    return `Redo last action`;
  }, [future, stagedState]);

  return {
    pushHistory,
    undo,
    redo,
    clearHistory,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    historySize: history.length,
    undoDescription: getUndoDescription(),
    redoDescription: getRedoDescription()
  };
}
