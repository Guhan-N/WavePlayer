import React, { useState } from 'react';
import './assets/styles/main.css';
import './assets/styles/animations.css';
import './assets/styles/responsive.css';

import { ToastProvider } from './context/ToastContext';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { PlayerProvider } from './context/PlayerContext';

import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { CreatePlaylistModal, AddToPlaylistModal } from './components/common/PlaylistModals';
import { MusicPlayer } from './components/player/MusicPlayer';
import { QueueDrawer } from './components/player/QueueDrawer';
import { VideoOverlay } from './components/player/VideoOverlay';

import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Library } from './pages/Library';
import { PlaylistDetail } from './pages/PlaylistDetail';
import { Favourites } from './pages/Favourites';
import { RecentlyPlayed } from './pages/RecentlyPlayed';
import { ImportExport } from './pages/ImportExport';
import { Settings } from './pages/Settings';

const MainAppShell = () => {
  const { refreshRecentlyPlayed } = useLibrary();
  const [currentTab, setCurrentTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [addToPlaylistTargetSong, setAddToPlaylistTargetSong] = useState(null);

  const handleNavigate = (tabId) => {
    setCurrentTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActivePage = () => {
    if (currentTab === 'home') {
      return (
        <Home
          onNavigate={handleNavigate}
          onOpenAddToPlaylistModal={(song) => setAddToPlaylistTargetSong(song)}
          onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
        />
      );
    }
    if (currentTab === 'search') {
      return (
        <Search
          initialQuery={searchQuery}
          onOpenAddToPlaylistModal={(song) => setAddToPlaylistTargetSong(song)}
        />
      );
    }
    if (currentTab === 'library') {
      return (
        <Library
          onNavigate={handleNavigate}
          onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          onOpenAddToPlaylistModal={(song) => setAddToPlaylistTargetSong(song)}
        />
      );
    }
    if (currentTab === 'favourites') {
      return (
        <Favourites
          onOpenAddToPlaylistModal={(song) => setAddToPlaylistTargetSong(song)}
        />
      );
    }
    if (currentTab === 'history') {
      return (
        <RecentlyPlayed
          onOpenAddToPlaylistModal={(song) => setAddToPlaylistTargetSong(song)}
        />
      );
    }
    if (currentTab === 'importexport') {
      return <ImportExport />;
    }
    if (currentTab === 'settings') {
      return <Settings />;
    }
    if (currentTab.startsWith('playlist_')) {
      const playlistId = currentTab.replace('playlist_', '');
      return (
        <PlaylistDetail
          playlistId={playlistId}
          onNavigate={handleNavigate}
          onOpenAddToPlaylistModal={(song) => setAddToPlaylistTargetSong(song)}
        />
      );
    }
    return (
      <Home
        onNavigate={handleNavigate}
        onOpenAddToPlaylistModal={(song) => setAddToPlaylistTargetSong(song)}
        onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
      />
    );
  };

  return (
    <PlayerProvider refreshRecentlyPlayed={refreshRecentlyPlayed}>
      <div className="app-container">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
        />

        {/* Main Content Area */}
        <div className="main-wrapper">
          <Header
            onNavigate={handleNavigate}
            currentTab={currentTab}
            searchQuery={searchQuery}
            onSearchSubmit={(q) => {
              setSearchQuery(q);
              handleNavigate('search');
            }}
          />
          {renderActivePage()}
        </div>

        {/* Audio-Only Music Player */}
        <MusicPlayer onOpenAddToPlaylistModal={(song) => setAddToPlaylistTargetSong(song)} />
        <VideoOverlay />

        {/* Slide-over Queue Drawer */}
        <QueueDrawer />

        {/* Mobile Bottom Tab Bar */}
        <BottomNav currentTab={currentTab} onNavigate={handleNavigate} />

        {/* Playlist Creation Dialog */}
        <CreatePlaylistModal
          isOpen={isCreatePlaylistOpen}
          onClose={() => setIsCreatePlaylistOpen(false)}
          onNavigate={handleNavigate}
        />

        {/* Add Song to Playlist Dialog */}
        <AddToPlaylistModal
          isOpen={!!addToPlaylistTargetSong}
          onClose={() => setAddToPlaylistTargetSong(null)}
          targetSong={addToPlaylistTargetSong}
          onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
        />
      </div>
    </PlayerProvider>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <LibraryProvider>
        <MainAppShell />
      </LibraryProvider>
    </ToastProvider>
  );
}
