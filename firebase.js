// Firebase Configuration
// Replace this with your actual Firebase config object
const firebaseConfig = {
    apiKey: "AIzaSyBXJ_RnfjUDi7qPDATWVnS5lSFw6jVRYgo",
      authDomain: "shopping-e284c.firebaseapp.com",
      databaseURL: "https://shopping-e284c-default-rtdb.firebaseio.com",
      projectId: "shopping-e284c",
      storageBucket: "shopping-e284c.appspot.com",
      messagingSenderId: "248274428739",
      appId: "1:248274428739:web:fc30dd9eb1ef83f610c5f6",
      measurementId: "G-ZXZCK9BW7T"
};

// Initialize Firebase
function initializeApp() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        console.log('Firebase initialized successfully');
        return firebase.database();
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        // Show user-friendly error message
        showConnectionError();
        return null;
    }
}

// Error handling for connection issues
function showConnectionError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'connection-error';
    errorDiv.innerHTML = `
        <div class="error-content">
            <h3>🔌 Connection Error</h3>
            <p>Unable to connect to Firebase. Please check your internet connection and try again.</p>
            <button onclick="location.reload()" class="retry-button">Retry</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
}

// Database helper functions
const DatabaseHelpers = {
    // Get all teams
    getAllTeams: () => {
        return firebase.database().ref('teams').once('value');
    },

    // Add minus point to a specific team
    addMinusPoint: (teamId) => {
        const teamRef = firebase.database().ref(`teams/${teamId}`);
        return teamRef.transaction((currentData) => {
            if (currentData === null) {
                return currentData; // Abort the transaction
            }
            
            if (currentData.eliminated || currentData.minusCount >= 3) {
                return; // Abort - team already eliminated or at max points
            }

            const newMinusCount = (currentData.minusCount || 0) + 1;
            const updates = {
                ...currentData,
                minusCount: newMinusCount,
                lastUpdated: Date.now()
            };

            // Auto-eliminate if reaching 3 minus points
            if (newMinusCount >= 3) {
                updates.eliminated = true;
                updates.eliminatedAt = Date.now();
            }

            return updates;
        });
    },

    // Reset all teams
    resetAllTeams: () => {
        const updates = {};
        
        // First get all current teams
        return firebase.database().ref('teams').once('value').then((snapshot) => {
            const teams = snapshot.val() || {};
            
            Object.keys(teams).forEach(teamId => {
                updates[`teams/${teamId}/minusCount`] = 0;
                updates[`teams/${teamId}/eliminated`] = false;
                updates[`teams/${teamId}/lastUpdated`] = Date.now();
                updates[`teams/${teamId}/eliminatedAt`] = null;
            });
            
            return firebase.database().ref().update(updates);
        });
    },

    // Initialize teams if they don't exist
    initializeTeams: () => {
        return firebase.database().ref('teams').once('value').then((snapshot) => {
            if (!snapshot.exists()) {
                const initialTeams = {};
                for (let i = 0; i < 26; i++) {
                    const teamId = String.fromCharCode(65 + i); // A-Z
                    initialTeams[teamId] = {
                        name: `Team ${teamId}`,
                        minusCount: 0,
                        eliminated: false,
                        createdAt: Date.now(),
                        lastUpdated: Date.now()
                    };
                }
                return firebase.database().ref('teams').set(initialTeams);
            }
        });
    },

    // Get team statistics
    getTeamStats: () => {
        return firebase.database().ref('teams').once('value').then((snapshot) => {
            const teams = snapshot.val() || {};
            const stats = {
                total: 0,
                active: 0,
                eliminated: 0,
                atRisk: 0, // Teams with 2 minus points
                teams: teams
            };

            Object.values(teams).forEach(team => {
                stats.total++;
                if (team.eliminated) {
                    stats.eliminated++;
                } else {
                    stats.active++;
                    if (team.minusCount === 2) {
                        stats.atRisk++;
                    }
                }
            });

            return stats;
        });
    },

    // Log admin actions (for audit trail)
    logAction: (action, teamId, adminId = 'anonymous') => {
        const logRef = firebase.database().ref('admin_logs').push();
        return logRef.set({
            action: action,
            teamId: teamId,
            adminId: adminId,
            timestamp: Date.now(),
            userAgent: navigator.userAgent.substring(0, 100) // Limited for privacy
        });
    }
};

// Connection state monitoring
function monitorConnection() {
    const connectedRef = firebase.database().ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        const connected = snapshot.val();
        const statusIndicator = document.getElementById('connectionStatus');
        
        if (statusIndicator) {
            if (connected) {
                statusIndicator.textContent = '🟢 Connected';
                statusIndicator.className = 'status-connected';
            } else {
                statusIndicator.textContent = '🔴 Disconnected';
                statusIndicator.className = 'status-disconnected';
            }
        }
        
        // Update body class for styling
        document.body.classList.toggle('disconnected', !connected);
    });
}

// Offline support
function handleOfflineMode() {
    window.addEventListener('online', () => {
        console.log('Back online');
        location.reload(); // Simple refresh when back online
    });

    window.addEventListener('offline', () => {
        console.log('Gone offline');
        const offlineDiv = document.createElement('div');
        offlineDiv.className = 'offline-banner';
        offlineDiv.innerHTML = `
            <div class="offline-content">
                📡 You're offline. Changes will sync when connection is restored.
            </div>
        `;
        document.body.appendChild(offlineDiv);
    });
}

// Performance monitoring
function logPerformance(action, startTime) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`Performance: ${action} took ${duration}ms`);
    
    // Log slow operations (>2 seconds)
    if (duration > 2000) {
        console.warn(`Slow operation detected: ${action} took ${duration}ms`);
    }
}

// Initialize performance and connection monitoring
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        handleOfflineMode();
        // monitorConnection(); // Uncomment if you want connection status
    }
});

// Export for use in other files
window.DatabaseHelpers = DatabaseHelpers;
window.initializeApp = initializeApp;