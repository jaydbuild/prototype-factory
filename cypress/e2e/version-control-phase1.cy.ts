/// <reference types="cypress" />

// Helper function to toggle feature flags
function setFeatureFlags(flags: Record<string, boolean>) {
  return cy.task('supabaseExecute', {
    query: `
      UPDATE feature_flags 
      SET enabled = CASE 
        WHEN key = 'version_control_enabled' THEN ${flags.version_control_enabled}
        WHEN key = 'version_ui_ro' THEN ${flags.version_ui_ro}
        WHEN key = 'version_upload_beta' THEN ${flags.version_upload_beta}
        ELSE enabled
      END
      WHERE key IN ('version_control_enabled', 'version_ui_ro', 'version_upload_beta')
    `
  });
}

// Helper function to set user role
function setUserRole(userId: string, isInternalTester: boolean) {
  return cy.task('supabaseExecute', {
    query: `
      UPDATE profiles
      SET internal_tester = ${isInternalTester}
      WHERE id = '${userId}'
    `
  });
}

describe('Version Control Phase 1', () => {
  const testPrototypeId = Cypress.env('TEST_PROTOTYPE_ID');
  const testUserId = Cypress.env('TEST_USER_ID');
  
  before(() => {
    // Ensure we have valid test IDs
    expect(testPrototypeId).to.be.a('string');
    expect(testUserId).to.be.a('string');
  });
  
  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
    
    // Login test user
    cy.task('supabaseLogin', {
      email: Cypress.env('TEST_USER_EMAIL'),
      password: Cypress.env('TEST_USER_PASSWORD')
    });
    
    // Visit prototype page
    cy.visit(`/prototypes/${testPrototypeId}`);
  });
  
  context('Feature Flag and Role Gating', () => {
    it('should not show version selector when all flags are disabled', () => {
      // Disable all flags
      setFeatureFlags({
        version_control_enabled: false,
        version_ui_ro: false,
        version_upload_beta: false
      });
      
      // Set user as internal tester
      setUserRole(testUserId, true);
      
      // Reload page
      cy.reload();
      
      // Verify version selector is not visible
      cy.get('[data-testid="version-selector"]').should('not.exist');
    });
    
    it('should not show version selector when user is not an internal tester', () => {
      // Enable all flags
      setFeatureFlags({
        version_control_enabled: true,
        version_ui_ro: true,
        version_upload_beta: true
      });
      
      // Set user as NOT an internal tester
      setUserRole(testUserId, false);
      
      // Reload page
      cy.reload();
      
      // Verify version selector is not visible
      cy.get('[data-testid="version-selector"]').should('not.exist');
    });
    
    it('should show version selector when version_ui_ro flag is enabled and user is internal tester', () => {
      // Enable necessary flags
      setFeatureFlags({
        version_control_enabled: true,
        version_ui_ro: true,
        version_upload_beta: false
      });
      
      // Set user as internal tester
      setUserRole(testUserId, true);
      
      // Reload page
      cy.reload();
      
      // Verify version selector is visible
      cy.get('[data-testid="version-selector"]').should('exist');
      
      // Open dropdown and verify "Add Version" option is NOT present
      cy.get('[data-testid="version-selector"]').click();
      cy.get('[data-testid="add-version-item"]').should('not.exist');
    });
    
    it('should show Add Version button when version_upload_beta flag is enabled', () => {
      // Enable all flags
      setFeatureFlags({
        version_control_enabled: true,
        version_ui_ro: true,
        version_upload_beta: true
      });
      
      // Set user as internal tester
      setUserRole(testUserId, true);
      
      // Reload page
      cy.reload();
      
      // Verify version selector is visible
      cy.get('[data-testid="version-selector"]').should('exist');
      
      // Open dropdown and verify "Add Version" option is present
      cy.get('[data-testid="version-selector"]').click();
      cy.get('[data-testid="add-version-item"]').should('exist');
    });
  });
  
  context('Version Selection and Persistence', () => {
    beforeEach(() => {
      // Enable all flags
      setFeatureFlags({
        version_control_enabled: true,
        version_ui_ro: true,
        version_upload_beta: true
      });
      
      // Set user as internal tester
      setUserRole(testUserId, true);
    });
    
    it('should show version list and select a version', () => {
      // Open version selector
      cy.get('[data-testid="version-selector"]').click();
      
      // Verify versions are loaded
      cy.get('[data-testid="version-item"]').should('have.length.at.least', 1);
      
      // Select first version
      cy.get('[data-testid="version-item"]').first().click();
      
      // Verify iframe source updates
      cy.get('iframe').should('have.attr', 'src').and('include', 'prototypes/');
      
      // Verify selection is persisted in localStorage
      cy.window().then((win) => {
        const storedId = win.localStorage.getItem(`prototype_version_${testPrototypeId}`);
        expect(storedId).to.be.a('string');
      });
    });
    
    it('should persist version selection across page reloads', () => {
      // Open version selector
      cy.get('[data-testid="version-selector"]').click();
      
      // Get ID of first version
      let firstVersionId: string;
      cy.get('[data-testid="version-item"]').first().invoke('attr', 'data-state')
        .then((state) => {
          if (state === 'checked') {
            // Already selected, get next one instead
            cy.get('[data-testid="version-item"]').eq(1).click();
          } else {
            // Select first one
            cy.get('[data-testid="version-item"]').first().click();
          }
        });
      
      // Get current iframe src
      cy.get('iframe').invoke('attr', 'src').then((src) => {
        // Reload page
        cy.reload();
        
        // Verify iframe still has the same src
        cy.get('iframe').should('have.attr', 'src', src);
      });
    });
    
    it('should only allow selecting versions with ready status', () => {
      // Open version selector
      cy.get('[data-testid="version-selector"]').click();
      
      // Verify status badges exist
      cy.get('[data-testid="status-badge"]').should('exist');
      
      // Any non-ready versions should be disabled
      cy.get('[data-testid="version-item"]').each(($el) => {
        const $badge = $el.find('[data-testid="status-badge"]');
        if ($badge.text() !== 'Ready') {
          cy.wrap($el).should('have.attr', 'aria-disabled', 'true');
        }
      });
    });
  });
  
  context('Version Upload Modal', () => {
    beforeEach(() => {
      // Enable all flags
      setFeatureFlags({
        version_control_enabled: true,
        version_ui_ro: true,
        version_upload_beta: true
      });
      
      // Set user as internal tester
      setUserRole(testUserId, true);
    });
    
    it('should open upload modal when Add Version is clicked', () => {
      // Open version selector
      cy.get('[data-testid="version-selector"]').click();
      
      // Click Add Version
      cy.get('[data-testid="add-version-item"]').click();
      
      // Verify modal is open
      cy.get('[data-testid="version-upload-modal"]').should('be.visible');
      cy.get('[data-testid="version-upload-form"]').should('exist');
    });
    
    it('should validate file input', () => {
      // Open version selector and click Add Version
      cy.get('[data-testid="version-selector"]').click();
      cy.get('[data-testid="add-version-item"]').click();
      
      // Try to submit without a file
      cy.get('[data-testid="upload-button"]').should('be.disabled');
      
      // Upload invalid file type
      cy.get('[data-testid="file-input"]').attachFile({
        filePath: 'fixtures/test-file.txt',
        fileName: 'test-file.txt',
        mimeType: 'text/plain'
      });
      
      // Check error message
      cy.get('[data-testid="file-error"]').should('be.visible')
        .and('contain', 'must be a ZIP');
      
      // Upload valid ZIP file
      cy.get('[data-testid="file-input"]').attachFile({
        filePath: 'fixtures/test-prototype.zip',
        fileName: 'test-prototype.zip',
        mimeType: 'application/zip'
      });
      
      // Verify upload button is enabled
      cy.get('[data-testid="upload-button"]').should('be.enabled');
    });
    
    it('should handle optional metadata fields', () => {
      // Open version selector and click Add Version
      cy.get('[data-testid="version-selector"]').click();
      cy.get('[data-testid="add-version-item"]').click();
      
      // Upload valid ZIP file
      cy.get('[data-testid="file-input"]').attachFile({
        filePath: 'fixtures/test-prototype.zip',
        fileName: 'test-prototype.zip',
        mimeType: 'application/zip'
      });
      
      // Fill in optional fields
      cy.get('[data-testid="title-input"]').type('Test Version Title');
      cy.get('[data-testid="description-input"]').type('This is a test version description');
      cy.get('[data-testid="figma-url-input"]').type('https://figma.com/file/test');
      
      // Verify upload button is enabled
      cy.get('[data-testid="upload-button"]').should('be.enabled');
      
      // Verify invalid URL validation
      cy.get('[data-testid="figma-url-input"]').clear().type('not-a-url');
      cy.get('[data-testid="upload-button"]').click();
      cy.get('[data-testid="version-upload-modal"]').should('be.visible'); // Modal should still be open
    });
    
    it('should handle API rate limits (429 soft cap)', () => {
      // Mock the API to return 429 for version soft cap
      cy.intercept('POST', '/api/prototypes/*/versions', {
        statusCode: 429,
        body: {
          message: 'You have reached the version limit for this prototype'
        }
      }).as('versionUpload');
      
      // Open version selector and click Add Version
      cy.get('[data-testid="version-selector"]').click();
      cy.get('[data-testid="add-version-item"]').click();
      
      // Upload valid ZIP file
      cy.get('[data-testid="file-input"]').attachFile({
        filePath: 'fixtures/test-prototype.zip',
        fileName: 'test-prototype.zip',
        mimeType: 'application/zip'
      });
      
      // Click upload
      cy.get('[data-testid="upload-button"]').click();
      
      // Wait for API call
      cy.wait('@versionUpload');
      
      // Verify toast error for version limit
      cy.contains('Version limit reached').should('be.visible');
    });
  });
});
