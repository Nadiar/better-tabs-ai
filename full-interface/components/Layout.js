// Layout Component - Main 3-column layout
function Layout() {
  const { stagedState, hasChanges, showConflictBanner, resetToOriginal, applyChanges, refreshFromChrome } = useStagedStateContext();
  const [isApplying, setIsApplying] = React.useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await applyChanges();
    } catch (error) {
      console.error('Failed to apply changes:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Discard all changes?')) {
      resetToOriginal();
    }
  };

  const handleRefresh = async () => {
    if (!hasChanges || confirm('Refreshing will discard unsaved changes. Continue?')) {
      await refreshFromChrome();
    }
  };

  return (
    <div className="app-container">
      <Header
        hasChanges={hasChanges}
        onApply={handleApply}
        onCancel={handleCancel}
        isApplying={isApplying}
      />

      {showConflictBanner && (
        <ConflictBanner
          onRefresh={handleRefresh}
          onIgnore={() => {/* Hide banner */}}
        />
      )}

      <main className="main-content">
        <div className="three-column-grid">
          <UngroupedColumn tabs={stagedState.tabs} />
          <GroupsColumn groups={stagedState.groups} tabs={stagedState.tabs} />
          <NewGroupBox />
        </div>
      </main>

      <footer className="main-footer">
        {hasChanges && (
          <span className="footer-status">
            {/* TODO: Show detailed change count */}
            Unsaved changes pending
          </span>
        )}
      </footer>
    </div>
  );
}