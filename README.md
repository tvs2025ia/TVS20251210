# Sistema-POS-Inventario-y-Contabilidad_Multi-tienda
Creado para Lovely Dimar
Para Tiendas Gio

Pendientes:
si yo deseo que los usuarios puedan ingresar a la a cualquiera de las tiendas. osea que el logueo los obligue a seleccionar una tienda para ingresar, y con esa automaticamente quede, que el unico que pueda cambiar desde el layaut de tienda es el usuario tipo o rol admin, pero que el usuario no quede amarrado a una unica tienda. ejemplo empleado1, pueda ingresar a todas las tiendas creadas, y que cuando seleccione la tienda al ingreso con esa quede logueado, que para cambiar de tienda deba cerrar sesión y volver a iniciar sesión. Desdeo que esa opcion que esta en admin de seleccionar tienda mejor sea una opcion de a que tiendas tiene permiso de ingresar no a que tienda solo puede ingresar, para que asi un usuario pueda ingresar si el desea a cualquier tienda. todo esto se debe de manejar desde supabase y offline. como se ha estado manejando.

quieres que el usuario pueda ingresar a cualquiera de las tiendas, pero al iniciar sesión debe elegir una tienda con la que quedará “logueado” temporalmente. Además, solo los administradores podrán cambiar la tienda desde el layout, mientras que los empleados deberán cerrar sesión y volver a ingresar para cambiar de tienda.


login:
  Usa IndexedDB junto con supabase para el manejo de usuarios, eliminar usuarios mock