# 🔗 Wallet Integration & Improvement Plan

## 📋 Current Issues Identified

### 🚨 Critical Issues in Wallet Creation
1. **Poor Error Handling**: Limited retry mechanisms and unclear error messages
2. **No Backup Validation**: Users can proceed without proper mnemonic backup
3. **Inconsistent UX**: Different flows for new vs existing users
4. **Missing Integration**: Secondary wallet operates independently
5. **Security Gaps**: No hardware wallet support, limited entropy validation
6. **Database Inconsistencies**: Profile creation can fail silently

### 🔄 Secondary Wallet Isolation
1. **No User Linking**: Secondary wallet not connected to main user profile
2. **Separate Storage**: Different encryption/storage mechanisms
3. **No Cross-Chain Benefits**: Can't leverage referral system, RZC rewards
4. **Missing Analytics**: No tracking of multi-chain usage

## 🎯 Proposed Solutions

### 1. Database Schema Enhancement

#### Add Multi-Chain Support to User Profiles
```sql
-- Add secondary wallet fields to wallet_users table
ALTER TABLE wallet_users 
ADD COLUMN IF NOT EXISTS secondary_wallet_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS evm_address TEXT,
ADD COLUMN IF NOT EXISTS evm_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS secondary_wallet_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS secondary_wallet_last_used TIMESTAMPTZ;

-- Create secondary wallet transactions table
CREATE TABLE IF NOT EXISTS secondary_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  chain_type TEXT NOT NULL CHECK (chain_type IN ('evm', 'ton')),
  wallet_address TEXT NOT NULL,
  transaction_hash TEXT,
  amount NUMERIC NOT NULL,
  asset_symbol TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('send', 'receive', 'swap')),
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wallet linking table for multiple wallets per user
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('primary_ton', 'secondary_multi', 'imported')),
  wallet_address TEXT NOT NULL,
  chain_type TEXT NOT NULL CHECK (chain_type IN ('ton', 'evm')),
  is_active BOOLEAN DEFAULT TRUE,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wallet_address, chain_type)
);
```

### 2. Enhanced Wallet Creation Service

#### Professional Wallet Creation Flow
```typescript
// services/enhancedWalletService.ts
export class EnhancedWalletService {
  
  // Unified wallet creation with multi-chain support
  async createUnifiedWallet(options: {
    includeSecondaryWallet: boolean;
    referralCode?: string;
    password: string;
    backupVerified: boolean;
  }): Promise<WalletCreationResult> {
    
    const result: WalletCreationResult = {
      success: false,
      primaryWallet: null,
      secondaryWallet: null,
      userProfile: null,
      errors: []
    };

    try {
      // 1. Generate primary TON wallet
      const primaryResult = await this.generatePrimaryWallet(options.password);
      if (!primaryResult.success) {
        result.errors.push('Failed to generate primary wallet');
        return result;
      }
      result.primaryWallet = primaryResult.wallet;

      // 2. Generate secondary multi-chain wallet if requested
      if (options.includeSecondaryWallet) {
        const secondaryResult = await this.generateSecondaryWallet(
          primaryResult.wallet.mnemonic, 
          options.password
        );
        if (secondaryResult.success) {
          result.secondaryWallet = secondaryResult.wallet;
        } else {
          result.errors.push('Secondary wallet generation failed (continuing with primary only)');
        }
      }

      // 3. Create unified user profile
      const profileResult = await this.createUnifiedProfile({
        primaryAddress: primaryResult.wallet.address,
        evmAddress: result.secondaryWallet?.evmAddress,
        tonSecondaryAddress: result.secondaryWallet?.tonAddress,
        referralCode: options.referralCode
      });

      if (!profileResult.success) {
        result.errors.push('Profile creation failed');
        return result;
      }
      result.userProfile = profileResult.profile;

      // 4. Link wallets in database
      await this.linkWalletsToUser(result.userProfile.id, {
        primary: result.primaryWallet,
        secondary: result.secondaryWallet
      });

      // 5. Award bonuses and setup referrals
      await this.processWalletBonuses(result.userProfile.id, options.referralCode);

      result.success = true;
      return result;

    } catch (error) {
      result.errors.push(`Unexpected error: ${error.message}`);
      return result;
    }
  }

  // Enhanced backup verification with multiple methods
  async verifyBackupComprehensive(
    mnemonic: string[], 
    verificationMethod: 'word_positions' | 'full_phrase' | 'qr_scan'
  ): Promise<BackupVerificationResult> {
    // Implementation for different verification methods
  }

  // Entropy validation for security
  validateMnemonicEntropy(mnemonic: string[]): EntropyValidationResult {
    // Check for weak patterns, dictionary attacks, etc.
  }
}
```

### 3. Unified Wallet Context

#### Enhanced Wallet Context with Multi-Chain Support
```typescript
// context/UnifiedWalletContext.tsx
interface UnifiedWalletState {
  // Primary TON wallet
  primaryWallet: {
    address: string | null;
    balance: string;
    isActive: boolean;
  };
  
  // Secondary multi-chain wallet
  secondaryWallet: {
    isEnabled: boolean;
    evmAddress: string | null;
    tonAddress: string | null;
    evmBalance: string;
    tonBalance: string;
    isActive: boolean;
  };
  
  // User profile with all wallets
  userProfile: EnhancedUserProfile | null;
  
  // Unified actions
  enableSecondaryWallet: (password: string) => Promise<boolean>;
  switchActiveWallet: (walletType: 'primary' | 'secondary') => void;
  getUnifiedBalance: () => Promise<UnifiedBalance>;
  syncAllWallets: () => Promise<void>;
}
```

### 4. Improved User Experience

#### Wallet Creation Wizard
```typescript
// components/WalletCreationWizard.tsx
const WalletCreationWizard: React.FC = () => {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [options, setOptions] = useState<WalletCreationOptions>({
    walletType: 'primary_only', // 'primary_only' | 'multi_chain'
    backupMethod: 'manual', // 'manual' | 'cloud_encrypted' | 'hardware'
    securityLevel: 'standard', // 'standard' | 'enhanced'
    includeSecondaryWallet: false
  });

  const steps: WizardStep[] = [
    'welcome',           // Introduction and options
    'security_briefing', // Security education
    'wallet_type',       // Choose primary only or multi-chain
    'generate_primary',  // Generate TON wallet
    'backup_primary',    // Backup verification
    'generate_secondary', // Optional: Generate multi-chain
    'backup_secondary',  // Optional: Backup multi-chain
    'password_setup',    // Encryption password
    'final_verification', // Complete verification
    'completion'         // Success and next steps
  ];

  return (
    <WizardContainer>
      <ProgressIndicator steps={steps} currentStep={step} />
      
      {step === 'welcome' && (
        <WelcomeStep 
          onNext={() => setStep('security_briefing')}
          referralCode={referralCode}
        />
      )}
      
      {step === 'wallet_type' && (
        <WalletTypeSelection
          options={options}
          onChange={setOptions}
          onNext={() => setStep('generate_primary')}
        />
      )}
      
      {/* Additional steps... */}
    </WizardContainer>
  );
};
```

### 5. Database Integration Functions

#### Wallet Linking Functions
```sql
-- Function to link secondary wallet to existing user
CREATE OR REPLACE FUNCTION link_secondary_wallet_to_user(
  p_user_id UUID,
  p_evm_address TEXT,
  p_ton_address TEXT,
  p_wallet_nickname TEXT DEFAULT 'Multi-Chain Wallet'
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Update user profile with secondary wallet info
  UPDATE wallet_users 
  SET 
    secondary_wallet_enabled = TRUE,
    evm_address = p_evm_address,
    secondary_wallet_created_at = NOW(),
    secondary_wallet_last_used = NOW()
  WHERE id = p_user_id;

  -- Insert wallet records
  INSERT INTO user_wallets (user_id, wallet_type, wallet_address, chain_type, nickname)
  VALUES 
    (p_user_id, 'secondary_multi', p_evm_address, 'evm', p_wallet_nickname || ' (EVM)'),
    (p_user_id, 'secondary_multi', p_ton_address, 'ton', p_wallet_nickname || ' (TON)');

  -- Award multi-chain activation bonus
  UPDATE wallet_users 
  SET rzc_balance = rzc_balance + 100 -- 100 RZC bonus for enabling multi-chain
  WHERE id = p_user_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'wallet_linked',
    'Multi-Chain Wallet Activated! 🎉',
    'Your secondary wallet has been linked successfully. You earned 100 RZC bonus!',
    jsonb_build_object(
      'evm_address', p_evm_address,
      'ton_address', p_ton_address,
      'bonus_amount', 100
    )
  );

  SELECT jsonb_build_object(
    'success', true,
    'message', 'Secondary wallet linked successfully',
    'bonus_awarded', 100
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unified wallet info for user
CREATE OR REPLACE FUNCTION get_unified_wallet_info(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_info RECORD;
  v_wallets JSON;
  v_result JSON;
BEGIN
  -- Get user info
  SELECT 
    id, wallet_address, name, avatar, rzc_balance,
    secondary_wallet_enabled, evm_address,
    secondary_wallet_created_at, secondary_wallet_last_used
  INTO v_user_info
  FROM wallet_users 
  WHERE id = p_user_id;

  -- Get all linked wallets
  SELECT json_agg(
    json_build_object(
      'id', id,
      'wallet_type', wallet_type,
      'wallet_address', wallet_address,
      'chain_type', chain_type,
      'nickname', nickname,
      'is_active', is_active,
      'last_used', last_used
    )
  ) INTO v_wallets
  FROM user_wallets 
  WHERE user_id = p_user_id AND is_active = TRUE;

  SELECT jsonb_build_object(
    'user_profile', row_to_json(v_user_info),
    'linked_wallets', COALESCE(v_wallets, '[]'::json),
    'multi_chain_enabled', v_user_info.secondary_wallet_enabled
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6. Migration Strategy

#### For Existing Users
```typescript
// services/walletMigrationService.ts
export class WalletMigrationService {
  
  // Migrate existing users to unified system
  async migrateExistingUser(userId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedWallets: [],
      errors: []
    };

    try {
      // 1. Get existing user profile
      const userProfile = await supabaseService.getProfileById(userId);
      if (!userProfile.success) {
        result.errors.push('User profile not found');
        return result;
      }

      // 2. Create primary wallet record in new system
      const primaryWalletResult = await this.migratePrimaryWallet(userProfile.data);
      if (primaryWalletResult.success) {
        result.migratedWallets.push(primaryWalletResult.wallet);
      }

      // 3. Check if user has secondary wallet data
      const hasSecondaryWallet = await tetherWdkService.hasStoredWallet();
      if (hasSecondaryWallet) {
        const secondaryMigrationResult = await this.migrateSecondaryWallet(userId);
        if (secondaryMigrationResult.success) {
          result.migratedWallets.push(secondaryMigrationResult.wallet);
        }
      }

      // 4. Update user profile with migration status
      await supabaseService.updateProfile(userId, {
        migration_completed: true,
        migration_completed_at: new Date().toISOString()
      });

      result.success = true;
      return result;

    } catch (error) {
      result.errors.push(`Migration failed: ${error.message}`);
      return result;
    }
  }

  // Offer secondary wallet to existing users
  async offerSecondaryWalletUpgrade(userId: string): Promise<UpgradeOfferResult> {
    // Check if user is eligible for secondary wallet
    // Show upgrade modal with benefits
    // Guide through secondary wallet creation
  }
}
```

### 7. Enhanced Security Features

#### Multi-Layer Security
```typescript
// utils/enhancedSecurity.ts
export class EnhancedSecurityManager {
  
  // Validate mnemonic strength
  validateMnemonicSecurity(mnemonic: string[]): SecurityValidationResult {
    const checks = {
      entropyLevel: this.calculateEntropy(mnemonic),
      dictionaryAttackResistance: this.checkDictionaryAttack(mnemonic),
      patternDetection: this.detectWeakPatterns(mnemonic),
      checksumValidation: this.validateBIP39Checksum(mnemonic)
    };

    return {
      isSecure: Object.values(checks).every(check => check.passed),
      checks,
      recommendations: this.generateSecurityRecommendations(checks)
    };
  }

  // Hardware wallet integration
  async detectHardwareWallets(): Promise<HardwareWallet[]> {
    // Detect Ledger, Trezor, etc.
  }

  // Biometric authentication setup
  async setupBiometricAuth(): Promise<BiometricSetupResult> {
    // WebAuthn integration for supported devices
  }
}
```

## 🚀 Implementation Roadmap

### Phase 1: Database & Backend (Week 1-2)
- [ ] Create database migration scripts
- [ ] Implement wallet linking functions
- [ ] Create unified user profile system
- [ ] Add multi-chain transaction tracking

### Phase 2: Enhanced Wallet Creation (Week 3-4)
- [ ] Build professional wallet creation wizard
- [ ] Implement comprehensive backup verification
- [ ] Add entropy validation and security checks
- [ ] Create migration service for existing users

### Phase 3: UI/UX Improvements (Week 5-6)
- [ ] Design unified wallet interface
- [ ] Implement wallet type selection
- [ ] Create secondary wallet upgrade flow
- [ ] Add multi-chain balance display

### Phase 4: Integration & Testing (Week 7-8)
- [ ] Integrate secondary wallet with referral system
- [ ] Enable RZC rewards for multi-chain activities
- [ ] Comprehensive testing and security audit
- [ ] User acceptance testing

### Phase 5: Deployment & Migration (Week 9-10)
- [ ] Deploy to staging environment
- [ ] Migrate existing users gradually
- [ ] Monitor system performance
- [ ] Full production deployment

## 📊 Success Metrics

### Technical Metrics
- **Wallet Creation Success Rate**: >99%
- **Backup Verification Rate**: >95%
- **Migration Success Rate**: >98%
- **Cross-Chain Transaction Success**: >99%

### User Experience Metrics
- **Wallet Creation Time**: <5 minutes
- **User Satisfaction Score**: >4.5/5
- **Support Ticket Reduction**: 50%
- **Multi-Chain Adoption Rate**: >30%

### Business Metrics
- **User Retention**: +20%
- **Multi-Chain Activity**: +150%
- **RZC Token Utility**: +100%
- **Referral Program Effectiveness**: +40%

## 🔒 Security Considerations

### Enhanced Security Measures
1. **Multi-Factor Authentication**: Optional 2FA for wallet access
2. **Hardware Wallet Support**: Ledger/Trezor integration
3. **Biometric Authentication**: WebAuthn for supported devices
4. **Advanced Encryption**: AES-256-GCM with PBKDF2
5. **Audit Trail**: Complete logging of all wallet operations
6. **Rate Limiting**: Prevent brute force attacks
7. **Secure Backup**: Multiple backup verification methods

### Compliance & Auditing
1. **Security Audit**: Third-party security review
2. **Penetration Testing**: Regular security testing
3. **Compliance Check**: Ensure regulatory compliance
4. **Bug Bounty Program**: Community security testing
5. **Regular Updates**: Keep dependencies updated

This comprehensive plan addresses all identified issues and provides a roadmap for creating a professional, secure, and user-friendly wallet system that seamlessly integrates primary TON wallets with secondary multi-chain capabilities.