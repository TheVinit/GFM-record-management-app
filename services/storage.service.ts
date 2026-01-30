import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

/**
 * Opens document picker to select absence proof
 * @returns Selected document or null
 */
export const pickAbsenceProof = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true
        });

        if (result.canceled) {
            return null;
        }

        return result.assets[0];
    } catch (error) {
        console.error('Error picking document:', error);
        Alert.alert('Error', 'Failed to pick document');
        return null;
    }
};

import { uploadToCloudinary } from './cloudinaryservices';

/**
 * Uploads absence proof document to Cloudinary
 * @param file - File object from document picker
 * @param studentPrn - Student's PRN
 * @returns Public URL of uploaded file or null
 */
export const uploadAbsenceProof = async (
    file: any,
    studentPrn: string
): Promise<string | null> => {
    try {
        const fileName = `${studentPrn}_${Date.now()}_${file.name}`;

        // Use existing Cloudinary service
        // We put these in a specific folder for organization
        const url = await uploadToCloudinary(
            file.uri,
            file.mimeType || 'application/pdf',
            fileName,
            'absence_proofs'
        );

        if (!url) {
            throw new Error('Cloudinary returned null URL');
        }

        return url;
    } catch (error) {
        console.error('Error uploading absence proof:', error);
        Alert.alert('Error', 'Failed to upload document');
        return null;
    }
};

/**
 * Downloads or views an absence proof document
 * @param url - Public URL of the document
 */
export const viewAbsenceProof = async (url: string) => {
    try {
        const { Linking } = require('react-native');
        const canOpen = await Linking.canOpenURL(url);

        if (canOpen) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Cannot open document');
        }
    } catch (error) {
        console.error('Error viewing document:', error);
        Alert.alert('Error', 'Failed to open document');
    }
};

/**
 * Deletes an absence proof document from storage
 * Note: Cloudinary client-side deletion requires signature (API Secret) which is unsafe to expose.
 * For now, this just returns true to allow database cleanup. Orphaned files can be cleaned up via Cloudinary dashboard rules.
 * @param url - Public URL of the document
 * @returns Success boolean
 */
export const deleteAbsenceProof = async (url: string): Promise<boolean> => {
    console.log('Soft deleting file from Cloudinary (client-side restriction):', url);
    return true;
};
