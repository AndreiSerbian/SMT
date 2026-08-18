import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAdmin, createServiceClient } from "../_shared/adminAuth.ts";


// Маппинг размеров в папки
const SIZE_FOLDER_MAPPING: Record<string, string> = {
  'small': 'small with bow',
  'medium': 'medium with bow', 
  'big': 'big with bow'
};

// Маппинг цветов в папки
const COLOR_FOLDER_MAPPING: Record<string, string> = {
  '#FFB6C1': 'pink',
  '#1a1a1a': 'black',
  '#FFFFFF': 'white', 
  '#FFD700': 'gold',
  '#C0C0C0': 'silver',
  '#FF0000': 'red',
  '#FFA500': 'orange',
  '#FFCBA4': 'peach',
  '#B0E0E6': 'blue ice',
  '#003366': 'blue velvet',
  '#0ABAB5': 'tiffany',
  '#F3E5AB': 'vanilla',
  '#F8F8FF': 'white diamond',
  '#2F2F2F': 'black moire',
  '#E6E6FA': 'lavender',
  '#DDA0DD': 'lilac'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SAFE P0 patch: admin-only. Nothing privileged happens before this check.
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabaseClient = createServiceClient();

    const { action, size, colorHex, fileName, oldPath, newPath } = await req.json();


    switch (action) {
      case 'create_folder_structure':
        return await createFolderStructure(supabaseClient, size, colorHex);
      
      case 'move_file':
        return await moveFile(supabaseClient, oldPath, newPath);
      
      case 'delete_empty_folders':
        return await deleteEmptyFolders(supabaseClient, size, colorHex);
      
      case 'get_organized_path':
        return getOrganizedPath(size, colorHex, fileName);
      
      case 'list_folder_structure':
        return await listFolderStructure(supabaseClient);
      
      default:
        throw new Error('Unknown action');
    }

  } catch (error) {
    console.error('Storage manager error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function createFolderStructure(supabaseClient: any, size: string, colorHex: string) {
  try {
    const sizeFolder = SIZE_FOLDER_MAPPING[size];
    const colorFolder = COLOR_FOLDER_MAPPING[colorHex] || 'unknown';
    
    if (!sizeFolder) {
      throw new Error(`Unknown size: ${size}`);
    }

    const folderPath = `images/${sizeFolder}/${colorFolder}`;
    
    // Создаем пустой файл .gitkeep для создания структуры папок
    const { error } = await supabaseClient.storage
      .from('product-media')
      .upload(`${folderPath}/.gitkeep`, new Blob([''], { type: 'text/plain' }), {
        upsert: true
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        folderPath,
        message: `Создана структура папок: ${folderPath}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create folder structure: ${errorMessage}`);
  }
}

async function moveFile(supabaseClient: any, oldPath: string, newPath: string) {
  try {
    // Копируем файл в новое место
    const { data: file, error: downloadError } = await supabaseClient.storage
      .from('product-media')
      .download(oldPath);

    if (downloadError) throw downloadError;

    // Загружаем в новое место
    const { error: uploadError } = await supabaseClient.storage
      .from('product-media')
      .upload(newPath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Удаляем старый файл
    const { error: deleteError } = await supabaseClient.storage
      .from('product-media')
      .remove([oldPath]);

    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Файл перемещен с ${oldPath} в ${newPath}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to move file: ${errorMessage}`);
  }
}

async function deleteEmptyFolders(supabaseClient: any, size: string, colorHex: string) {
  try {
    const sizeFolder = SIZE_FOLDER_MAPPING[size];
    const colorFolder = COLOR_FOLDER_MAPPING[colorHex] || 'unknown';
    const folderPath = `images/${sizeFolder}/${colorFolder}`;

    // Получаем список файлов в папке
    const { data: files, error } = await supabaseClient.storage
      .from('product-media')
      .list(folderPath);

    if (error) throw error;

    // Если в папке только .gitkeep или пусто, удаляем .gitkeep
    if (!files || files.length === 0 || (files.length === 1 && files[0].name === '.gitkeep')) {
      await supabaseClient.storage
        .from('product-media')
        .remove([`${folderPath}/.gitkeep`]);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Очищены пустые папки в ${folderPath}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Игнорируем ошибки при удалении пустых папок
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Empty folders cleanup completed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function getOrganizedPath(size: string, colorHex: string, fileName: string) {
  const sizeFolder = SIZE_FOLDER_MAPPING[size];
  const colorFolder = COLOR_FOLDER_MAPPING[colorHex] || 'unknown';
  
  if (!sizeFolder) {
    throw new Error(`Unknown size: ${size}`);
  }

  // Извлекаем расширение файла
  const fileExt = fileName.split('.').pop();
  const baseName = fileName.replace(`.${fileExt}`, '');
  const organizedPath = `images/${sizeFolder}/${colorFolder}/${baseName}.${fileExt}`;

  return new Response(
    JSON.stringify({ 
      success: true, 
      path: organizedPath,
      sizeFolder,
      colorFolder
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listFolderStructure(supabaseClient: any) {
  try {
    const { data: folders, error } = await supabaseClient.storage
      .from('product-media')
      .list('images', { limit: 100 });

    if (error) throw error;

    const structure: any = {};
    
    for (const sizeFolder of folders || []) {
      if (sizeFolder.name.includes('with bow')) {
        const { data: colorFolders, error: colorError } = await supabaseClient.storage
          .from('product-media')
          .list(`images/${sizeFolder.name}`, { limit: 100 });

        if (!colorError && colorFolders) {
          structure[sizeFolder.name] = colorFolders
            .filter((folder: any) => folder.name !== '.gitkeep')
            .map((folder: any) => folder.name);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        structure 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to list folder structure: ${errorMessage}`);
  }
}
